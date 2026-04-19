import { useAppSelector } from "@/store/hooks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

interface PushTokenCache {
  token: string;
}

const getCacheKey = (userId: string) => `apex_fcm_registered_${userId}`;

const normalizeDeviceToken = (rawData: unknown): string | null => {
  if (typeof rawData === "string" && rawData.trim().length > 0) {
    return rawData.trim();
  }

  if (
    rawData &&
    typeof rawData === "object" &&
    "token" in rawData &&
    typeof (rawData as { token: unknown }).token === "string"
  ) {
    return ((rawData as { token: string }).token || "").trim() || null;
  }

  return null;
};

export const usePushToken = (): { registered: boolean } => {
  const [registered, setRegistered] = useState(false);
  const session = useAppSelector((s) => s.auth.session);
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    let isMounted = true;

    const register = async () => {
      if (!session?.access_token || !userId) {
        if (isMounted) setRegistered(false);
        console.log("[pushToken] skipped missing session");
        return;
      }

      try {
        const isExpoGo =
          Constants.executionEnvironment === "storeClient" ||
          Constants.appOwnership === "expo";

        if (isExpoGo) {
          console.log("[pushToken] skipped Expo Go runtime");
          return;
        }

        await Notifications.getExpoPushTokenAsync({
          projectId:
            Constants.expoConfig?.extra?.eas?.projectId ??
            Constants.easConfig?.projectId,
        });

        const deviceToken = await Notifications.getDevicePushTokenAsync();
        const fcmToken = normalizeDeviceToken(deviceToken.data);

        if (!fcmToken) {
          console.log("[pushToken] skipped token unavailable");
          return;
        }

        const cacheKey = getCacheKey(userId);
        const cachedRaw = await AsyncStorage.getItem(cacheKey);
        const cached = cachedRaw
          ? (JSON.parse(cachedRaw) as PushTokenCache)
          : null;

        if (cached?.token === fcmToken) {
          if (isMounted) setRegistered(true);
          console.log("[pushToken] skipped already registered");
          return;
        }

        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey =
          process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
          process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          console.log("[pushToken] failed missing supabase env");
          return;
        }

        const response = await fetch(
          `${supabaseUrl}/functions/v1/register-push-token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: supabaseAnonKey,
            },
            body: JSON.stringify({
              fcm_token: fcmToken,
              platform: Platform.OS === "ios" ? "ios" : "android",
            }),
          },
        );

        if (!response.ok) {
          const details = await response.text();
          console.log("[pushToken] failed register request", {
            status: response.status,
            details,
          });
          return;
        }

        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ token: fcmToken }),
        );

        if (isMounted) {
          setRegistered(true);
        }

        console.log("[pushToken] registered");
      } catch (error) {
        console.log("[pushToken] failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void register();

    return () => {
      isMounted = false;
    };
  }, [session?.access_token, userId]);

  return { registered };
};
