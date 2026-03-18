import { useTheme } from "@/lib/theme/ThemeContext";
import { Stack } from "expo-router";
import React from "react";

export default function ProfileGroupLayout() {
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
