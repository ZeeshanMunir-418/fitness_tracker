import { Stack } from "expo-router";
import React from "react";

const OnboardingLayout = () => {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    />
  );
};

export default OnboardingLayout;
