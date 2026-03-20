import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { RootState } from "@/store/index";
import {
    markNotificationRead,
    type InAppNotification,
} from "@/store/slices/notificationSlice";
import { cn } from "@/utils/cn";
import { useRouter } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Animated,
    PanResponder,
    Pressable,
    Text,
    View,
    type GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ActiveBannerNotification = {
  id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

export default function InAppNotificationBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queue = useAppSelector(
    (state: RootState) => state.notifications.inAppQueue,
  );

  const unreadNotification = useMemo(
    () => queue.find((item: InAppNotification) => !item.read) ?? null,
    [queue],
  );

  const [activeNotification, setActiveNotification] =
    useState<ActiveBannerNotification | null>(null);
  const translateY = useRef(new Animated.Value(-80)).current;
  const dismissingRef = useRef(false);

  const animateIn = useCallback(() => {
    translateY.setValue(-80);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const animateOut = useCallback(
    (onDone?: () => void) => {
      Animated.timing(translateY, {
        toValue: -80,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        onDone?.();
      });
    },
    [translateY],
  );

  const dismissCurrent = useCallback(
    (id: string) => {
      if (dismissingRef.current) {
        return;
      }

      dismissingRef.current = true;
      animateOut(() => {
        dispatch(markNotificationRead(id));
        dismissingRef.current = false;
      });
    },
    [animateOut, dispatch],
  );

  useEffect(() => {
    if (!unreadNotification) {
      setActiveNotification(null);
      return;
    }

    if (activeNotification?.id === unreadNotification.id) {
      return;
    }

    setActiveNotification({
      id: unreadNotification.id,
      title: unreadNotification.title,
      body: unreadNotification.body,
      data: unreadNotification.data,
    });
    dismissingRef.current = false;
    animateIn();
  }, [activeNotification?.id, animateIn, unreadNotification]);

  useEffect(() => {
    if (!activeNotification) {
      return;
    }

    const timeoutId = setTimeout(() => {
      dismissCurrent(activeNotification.id);
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [activeNotification, dismissCurrent]);

  const onPress = useCallback(
    (_event: GestureResponderEvent) => {
      if (!activeNotification) {
        return;
      }

      const screen = activeNotification.data?.screen;
      dismissCurrent(activeNotification.id);
      if (screen) {
        router.push(screen as never);
      }
    },
    [activeNotification, dismissCurrent, router],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) =>
          Math.abs(gestureState.dy) > 8,
        onPanResponderRelease: (_evt, gestureState) => {
          if (gestureState.dy < -20 && activeNotification) {
            dismissCurrent(activeNotification.id);
          }
        },
      }),
    [activeNotification, dismissCurrent],
  );

  if (!activeNotification) {
    return null;
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      className={cn("absolute left-0 right-0 px-4")}
      style={{
        top: 0,
        zIndex: 999,
        transform: [{ translateY }],
      }}
    >
      <Pressable
        onPress={onPress}
        className="overflow-hidden rounded-2xl"
        style={{
          marginTop: insets.top + 8,
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
        }}
      >
        <View className="flex-row items-center">
          <View
            style={{
              width: 4,
              alignSelf: "stretch",
              backgroundColor: colors.text,
            }}
          />
          <View className="flex-1 px-3 py-3">
            <Text
              style={{ color: colors.text }}
              className="font-dmsans-bold text-sm"
              numberOfLines={1}
            >
              {activeNotification.title || "Notification"}
            </Text>
            <Text
              style={{ color: colors.textMuted, marginTop: 2 }}
              className="font-dmsans text-xs"
              numberOfLines={2}
            >
              {activeNotification.body || "You have a new update."}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
