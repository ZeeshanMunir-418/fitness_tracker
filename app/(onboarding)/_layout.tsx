import { useTheme } from "@/lib/theme/ThemeContext";
import { Stack, usePathname } from "expo-router";
import React, { useEffect } from "react";
import { BackHandler } from "react-native";

const OnboardingLayout = () => {
  const { colors } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (pathname?.endsWith("step-1")) {
          return true;
        }

        return false;
      },
    );

    return () => subscription.remove();
  }, [pathname]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
};

export default OnboardingLayout;
