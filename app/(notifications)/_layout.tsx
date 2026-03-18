import { useTheme } from "@/lib/theme/ThemeContext";
import { Stack } from "expo-router";
import React from "react";

export default function NotificationsGroupLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
