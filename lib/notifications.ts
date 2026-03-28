import { supabase } from "@/lib/supabase";
import { store } from "@/store";
import Constants from "expo-constants";
import { NativeModulesProxy } from "expo-modules-core";
import type { Router } from "expo-router";
import { Platform } from "react-native";
import { enqueueInAppNotification } from "../store/slices/notificationSlice";

type NotificationsModule = typeof import("expo-notifications");
type NotificationPermissionStatus = "granted" | "denied" | "undetermined";

let cachedNotificationsModule: NotificationsModule | null = null;
let notificationHandlerConfigured = false;

const isExpoGoRuntime =
  Constants.executionEnvironment === "storeClient" ||
  Constants.appOwnership === "expo";

const isNotificationsSupportedRuntime = () => !isExpoGoRuntime;
const hasExpoPushTokenNativeModule =
  Boolean(
    (NativeModulesProxy as Record<string, unknown>).ExpoPushTokenManager,
  ) ||
  Boolean((NativeModulesProxy as Record<string, unknown>).ExpoNotifications);
const hasExpoDeviceNativeModule = Boolean(
  (NativeModulesProxy as Record<string, unknown>).ExpoDevice,
);

const normalizeNotificationsModule = (
  notificationsModule: unknown,
): NotificationsModule | null => {
  if (!notificationsModule || typeof notificationsModule !== "object") {
    return null;
  }

  const moduleRecord = notificationsModule as {
    default?: unknown;
    setNotificationHandler?: unknown;
  };

  if (typeof moduleRecord.setNotificationHandler === "function") {
    return notificationsModule as NotificationsModule;
  }

  if (
    moduleRecord.default &&
    typeof moduleRecord.default === "object" &&
    typeof (moduleRecord.default as { setNotificationHandler?: unknown })
      .setNotificationHandler === "function"
  ) {
    return moduleRecord.default as NotificationsModule;
  }

  return null;
};

const getNotificationsModule =
  async (): Promise<NotificationsModule | null> => {
    if (!isNotificationsSupportedRuntime()) {
      console.log(
        "[notifications] skipping native notifications in Expo Go runtime",
      );
      return null;
    }

    if (!hasExpoPushTokenNativeModule) {
      console.log(
        "[notifications] ExpoPushTokenManager native module unavailable in this build",
      );
      return null;
    }

    if (cachedNotificationsModule) {
      return cachedNotificationsModule;
    }

    try {
      const rawNotificationsModule = await import("expo-notifications");
      const notificationsModule = normalizeNotificationsModule(
        rawNotificationsModule,
      );

      if (!notificationsModule) {
        console.log(
          "[notifications] expo-notifications module missing expected APIs",
        );
        return null;
      }

      cachedNotificationsModule = notificationsModule;
      return notificationsModule;
    } catch (error) {
      console.error("[notifications] expo-notifications import failed", error);
      return null;
    }
  };

const ensureNotificationHandlerConfigured = async (): Promise<void> => {
  if (notificationHandlerConfigured) {
    return;
  }

  const notifications = await getNotificationsModule();

  if (!notifications) {
    return;
  }

  if (typeof notifications.setNotificationHandler !== "function") {
    console.log(
      "[notifications] setNotificationHandler unavailable in current runtime",
    );
    return;
  }

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  notificationHandlerConfigured = true;
};

const getIsPhysicalDevice = async (): Promise<boolean> => {
  if (!hasExpoDeviceNativeModule) {
    return Boolean(Constants.isDevice);
  }

  try {
    const deviceModule = await import("expo-device");
    return Boolean(deviceModule.isDevice);
  } catch (error) {
    console.error("[notifications] expo-device import failed", error);
    return Boolean(Constants.isDevice);
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  await ensureNotificationHandlerConfigured();

  const isPhysicalDevice = await getIsPhysicalDevice();

  if (!isPhysicalDevice) {
    console.error("[notifications] requestNotificationPermission end", {
      granted: false,
      reason: "not_a_physical_device",
    });
    return false;
  }

  const notifications = await getNotificationsModule();

  if (!notifications) {
    console.error("[notifications] requestNotificationPermission end", {
      granted: false,
      reason: "expo_notifications_module_missing",
    });
    return false;
  }

  if (typeof notifications.requestPermissionsAsync !== "function") {
    console.error("[notifications] requestNotificationPermission end", {
      granted: false,
      reason: "request_permissions_unavailable",
    });
    return false;
  }

  const permissionResult = (await notifications.requestPermissionsAsync()) as {
    status?: NotificationPermissionStatus;
  };
  const granted = permissionResult.status === "granted";

  if (
    Platform.OS === "android" &&
    typeof notifications.setNotificationChannelAsync === "function"
  ) {
    await notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
  return granted;
};

export const getExpoPushToken = async (): Promise<string | null> => {
  try {
    const notifications = await getNotificationsModule();

    if (!notifications) {
      console.error("[notifications] getExpoPushToken end", {
        success: false,
        reason: "expo_notifications_module_missing",
      });
      return null;
    }

    if (typeof notifications.getExpoPushTokenAsync !== "function") {
      console.error("[notifications] getExpoPushToken end", {
        success: false,
        reason: "get_expo_push_token_unavailable",
      });
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const token = await notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    console.error("[notifications] getExpoPushToken failed", error);
    return null;
  }
};

export const saveExpoPushTokenToSupabase = async (
  userId: string,
  token: string,
): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .update({ expo_push_token: token, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("[notifications] saveExpoPushTokenToSupabase failed", error);
    return;
  }
};

export const setupNotificationListeners = (router: Router): (() => void) => {
  let isUnmounted = false;
  let receivedSubscription: {
    remove: () => void;
  } | null = null;
  let responseSubscription: {
    remove: () => void;
  } | null = null;

  void (async () => {
    await ensureNotificationHandlerConfigured();
    const notifications = await getNotificationsModule();

    if (!notifications || isUnmounted) {
      return;
    }

    if (
      typeof notifications.addNotificationReceivedListener !== "function" ||
      typeof notifications.addNotificationResponseReceivedListener !==
        "function"
    ) {
      console.log(
        "[notifications] listener APIs unavailable in current runtime",
      );
      return;
    }

    receivedSubscription = notifications.addNotificationReceivedListener(
      (notification: unknown) => {
        const maybeNotification = notification as {
          request?: {
            content?: { title?: unknown; body?: unknown; data?: unknown };
          };
        };
        const content = maybeNotification.request?.content;
        const title = typeof content?.title === "string" ? content.title : "";
        const body = typeof content?.body === "string" ? content.body : "";
        const rawData = content?.data;
        const data: Record<string, string> | undefined =
          typeof rawData === "object" && rawData !== null
            ? Object.fromEntries(
                Object.entries(rawData as Record<string, unknown>).flatMap(
                  ([k, v]) => (typeof v === "string" ? [[k, v]] : []),
                ),
              )
            : undefined;

        store.dispatch(enqueueInAppNotification({ title, body, data }));
      },
    );

    responseSubscription =
      notifications.addNotificationResponseReceivedListener(
        (response: unknown) => {
          const maybeResponse = response as {
            notification?: {
              request?: {
                content?: {
                  data?: unknown;
                };
              };
            };
          };

          const maybeData = maybeResponse.notification?.request?.content?.data;
          const screenValue =
            typeof maybeData === "object" && maybeData !== null
              ? (maybeData as Record<string, unknown>).screen
              : undefined;

          if (typeof screenValue === "string" && screenValue.length > 0) {
            router.push(screenValue as never);
          }
        },
      );
  })();

  return () => {
    isUnmounted = true;
    receivedSubscription?.remove();
    responseSubscription?.remove();
    console.log("[notifications] setupNotificationListeners cleanup");
  };
};

export const scheduleLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> => {
  await ensureNotificationHandlerConfigured();

  const notifications = await getNotificationsModule();

  if (!notifications) {
    return;
  }

  if (typeof notifications.scheduleNotificationAsync !== "function") {
    return;
  }

  await notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null,
  });
};
