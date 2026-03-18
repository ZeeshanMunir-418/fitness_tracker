import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  nextStep,
  prevStep,
  updateOnboardingData,
} from "@/store/slices/onboardingSlice";
import { Href, useRouter } from "expo-router";
import { Bike, Footprints, Sofa, Trophy, Zap } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

const activityOptions = [
  {
    value: "sedentary" as const,
    title: "Sedentary",
    description: "Little to no regular physical activity.",
    Icon: Sofa,
  },
  {
    value: "lightly_active" as const,
    title: "Lightly Active",
    description: "Light workouts 1-3 days per week.",
    Icon: Footprints,
  },
  {
    value: "moderately_active" as const,
    title: "Moderately Active",
    description: "Consistent exercise 3-5 days weekly.",
    Icon: Bike,
  },
  {
    value: "very_active" as const,
    title: "Very Active",
    description: "Hard training most days of the week.",
    Icon: Zap,
  },
  {
    value: "athlete" as const,
    title: "Athlete",
    description: "High intensity training and performance focus.",
    Icon: Trophy,
  },
];

const StepThreeScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { activityLevel } = useAppSelector((s) => s.onboarding.data);

  return (
    <OnboardingShell
      step={3}
      totalSteps={8}
      title="Activity Level"
      subtitle="This helps us estimate your daily energy needs."
      onBack={() => {
        dispatch(prevStep());
        router.back();
      }}
      onNext={() => {
        dispatch(nextStep());
        router.push("/(onboarding)/step-4" as Href);
      }}
      nextDisabled={!activityLevel}
    >
      <View style={{ gap: 12 }}>
        {activityOptions.map(({ value, title, description, Icon }) => {
          const active = activityLevel === value;
          return (
            <Pressable
              key={value}
              onPress={() =>
                dispatch(updateOnboardingData({ activityLevel: value }))
              }
              style={{
                borderRadius: 24,
                borderWidth: 2,
                padding: 20,
                borderColor: active ? colors.border : colors.borderMuted,
                backgroundColor: active ? colors.text : "transparent",
              }}
            >
              <Icon
                size={24}
                color={active ? colors.background : colors.text}
                strokeWidth={2.2}
              />
              <Text
                style={{
                  color: active ? colors.background : colors.text,
                  marginTop: 12,
                  fontSize: 15,
                }}
                className="font-dmsans-bold"
              >
                {title}
              </Text>
              <Text
                style={{
                  color: active ? colors.background + "cc" : colors.textMuted,
                  marginTop: 4,
                  fontSize: 13,
                }}
                className="font-dmsans"
              >
                {description}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingShell>
  );
};

export default StepThreeScreen;
