import {
  getExpoPushToken,
  requestNotificationPermission,
  saveExpoPushTokenToSupabase,
  setupNotificationListeners,
} from "@/lib/notifications";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  setExpoPushToken as setExpoPushTokenAction,
  setPermissionGranted as setPermissionGrantedAction,
} from "../../store/slices/notificationSlice";

export interface UseNotificationsResult {
  permissionGranted: boolean;
  expoPushToken: string | null;
}

/**
 * Sets up notification permission, token registration, and push listeners.
 */
export const useNotifications = (): UseNotificationsResult => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state?.auth.user?.id ?? null);

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      const granted = await requestNotificationPermission();

      if (!isMounted) {
        return;
      }

      setPermissionGranted(granted);
      dispatch(setPermissionGrantedAction(granted));

      if (!granted) {
        return;
      }

      const token = await getExpoPushToken();

      if (!isMounted) {
        return;
      }

      setExpoPushToken(token);
      dispatch(setExpoPushTokenAction(token));

      if (token && userId) {
        await saveExpoPushTokenToSupabase(userId, token);
      }
    };

    setup();

    const cleanupListeners = setupNotificationListeners(router);

    return () => {
      isMounted = false;
      cleanupListeners();
    };
  }, [dispatch, router, userId]);

  return {
    permissionGranted,
    expoPushToken,
  };
};
