import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { RootState } from "@/store/index";
import {
    clearNotificationQueue,
    markAllNotificationsRead,
} from "@/store/slices/notificationSlice";
import { useRouter } from "expo-router";
import { ArrowLeft, BellOff } from "lucide-react-native";
import React, { useEffect, useMemo } from "react";
import {
    FlatList,
    Pressable,
    Text,
    View,
    type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  receivedAt: string;
  read: boolean;
};

const getRelativeTime = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1000));

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

export default function NotificationsInboxScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const notifications = useAppSelector(
    (state: RootState) => state.notifications.inAppQueue,
  );

  useEffect(() => {
    dispatch(markAllNotificationsRead());
  }, [dispatch]);

  const data = useMemo(() => notifications, [notifications]);

  const renderItem: ListRenderItem<NotificationRow> = ({ item }) => {
    return (
      <Pressable
        onPress={() => {
          const screen = item.data?.screen;
          if (screen) {
            router.push(screen as never);
          }
        }}
        style={{ borderBottomWidth: 1, borderColor: colors.border }}
        className="px-4 py-4"
      >
        <View className="flex-row items-start">
          <View className="mr-3 mt-1 w-2.5">
            {!item.read ? (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: colors.text,
                }}
              />
            ) : null}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between gap-3">
              <Text
                style={{ color: colors.text }}
                className="font-dmsans-bold text-sm"
                numberOfLines={1}
              >
                {item.title || "Notification"}
              </Text>
              <Text
                style={{ color: colors.textMuted }}
                className="font-dmsans text-xs"
              >
                {getRelativeTime(item.receivedAt)}
              </Text>
            </View>
            <Text
              style={{ color: colors.textMuted, marginTop: 4 }}
              className="font-dmsans text-xs"
              numberOfLines={2}
            >
              {item.body || "You have a new update."}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} strokeWidth={1.75} />
          </Pressable>
          <Text
            style={{ color: colors.text }}
            className="font-dmsans-bold text-2xl"
          >
            Notifications
          </Text>
        </View>
        <Pressable onPress={() => dispatch(clearNotificationQueue())}>
          <Text
            style={{ color: colors.text }}
            className="font-dmsans-bold text-xs uppercase"
          >
            Clear all
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6">
            <BellOff size={34} color={colors.textMuted} strokeWidth={1.8} />
            <Text
              style={{ color: colors.textMuted, marginTop: 10 }}
              className="font-dmsans text-sm"
            >
              No notifications yet
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
