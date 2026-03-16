import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
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

const StepTwoScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
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
              className={`rounded-3xl border-2 p-5 ${
                active ? "border-black bg-black" : "border-black bg-white"
              }`}
            >
              <Icon
                size={24}
                color={active ? "#fff" : "#000"}
                strokeWidth={2.2}
              />
              <Text
                className={`mt-3 font-dmsans-bold text-base ${
                  active ? "text-white" : "text-black"
                }`}
              >
                {title}
              </Text>
              <Text
                className={`mt-1 font-dmsans text-sm ${
                  active ? "text-white/80" : "text-neutral-500"
                }`}
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
