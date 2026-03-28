import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  nextStep,
  prevStep,
  updateOnboardingData,
} from "@/store/slices/onboardingSlice";
import { Href, useRouter } from "expo-router";
import {
  Dumbbell,
  Flame,
  Scale,
  StretchHorizontal,
  Timer,
} from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

const goalOptions = [
  {
    value: "lose_weight" as const,
    title: "Lose Weight",
    description: "Burn fat while preserving strength.",
    Icon: Flame,
  },
  {
    value: "build_muscle" as const,
    title: "Build Muscle",
    description: "Increase size and power progressively.",
    Icon: Dumbbell,
  },
  {
    value: "improve_endurance" as const,
    title: "Improve Endurance",
    description: "Boost stamina for longer training sessions.",
    Icon: Timer,
  },
  {
    value: "improve_flexibility" as const,
    title: "Improve Flexibility",
    description: "Move better and reduce stiffness.",
    Icon: StretchHorizontal,
  },
  {
    value: "maintain_weight" as const,
    title: "Maintain Weight",
    description: "Stay consistent and keep current shape.",
    Icon: Scale,
  },
];

export const StepTwoScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { primaryGoal } = useAppSelector((s) => s.onboarding.data);

  return (
    <OnboardingShell
      step={2}
      totalSteps={8}
      title="Primary Goal"
      subtitle="Choose the main outcome you want from Apex."
      onBack={() => {
        dispatch(prevStep());
        router.back();
      }}
      onNext={() => {
        dispatch(nextStep());
        router.push("/(onboarding)/step-3" as Href);
      }}
      nextDisabled={!primaryGoal}
    >
      <View className="gap-3">
        {goalOptions.map(({ value, title, description, Icon }) => {
          const active = primaryGoal === value;
          return (
            <Pressable
              key={value}
              onPress={() =>
                dispatch(updateOnboardingData({ primaryGoal: value }))
              }
              className="rounded-3xl border-2 p-5"
              style={{
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
                className="mt-3 font-dmsans-bold text-[15px]"
                style={{ color: active ? colors.background : colors.text }}
              >
                {title}
              </Text>
              <Text
                className="mt-1 font-dmsans text-[13px]"
                style={{
                  color: active ? colors.background + "cc" : colors.textMuted,
                }}
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

export default StepTwoScreen;
