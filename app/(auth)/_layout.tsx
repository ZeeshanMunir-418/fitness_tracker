import { useTheme } from "@/lib/theme/ThemeContext";
import { Stack } from "expo-router";
import React from "react";

const AuthLayout = () => {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
};

export default AuthLayout;
