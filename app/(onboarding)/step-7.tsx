import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  nextStep,
  prevStep,
  updateOnboardingData,
} from "@/store/slices/onboardingSlice";
import { cn } from "@/utils/cn";
import { Href, useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

const timeOptions = [
  { label: "🌅 Morning", value: "morning" as const },
  { label: "☀️ Afternoon", value: "afternoon" as const },
  { label: "🌆 Evening", value: "evening" as const },
];

const StepSevenScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { workoutReminders, preferredWorkoutTime, mealReminders } =
    useAppSelector((s) => s.onboarding.data);

  const nextDisabled = !preferredWorkoutTime;

  return (
    <OnboardingShell
      step={7}
      totalSteps={8}
      title="Notifications"
      subtitle="Set reminders so your routine stays on track."
      onBack={() => {
        dispatch(prevStep());
        router.back();
      }}
      onNext={() => {
        dispatch(nextStep());
        router.push("/(onboarding)/step-8" as Href);
      }}
      nextDisabled={nextDisabled}
    >
      <View className="gap-6">
        <View className="gap-2">
          <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
            Workout Reminders
          </Text>
          <View className="flex-row rounded-full border-2 border-black p-1">
            {[true, false].map((value) => {
              const active = workoutReminders === value;
              return (
                <Pressable
                  key={String(value)}
                  onPress={() =>
                    dispatch(updateOnboardingData({ workoutReminders: value }))
                  }
                  className={`flex-1 items-center rounded-full py-3 ${
                    active ? "bg-black" : "bg-white"
                  }`}
                >
                  <Text
                    className={`font-dmsans-bold text-sm ${
                      active ? "text-white" : "text-black"
                    }`}
                  >
                    {value ? "YES" : "NO"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
            Preferred Workout Time
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {timeOptions.map((option) => {
              const active = preferredWorkoutTime === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    dispatch(
                      updateOnboardingData({
                        preferredWorkoutTime: option.value,
                      }),
                    )
                  }
                  className={cn("mt-0 p-4 rounded-full border-2 border-black", {
                    "bg-black": active,
                    "bg-white": !active,
                  })}
                >
                  <Text
                    className={cn("font-dmsans", {
                      "text-white": active,
                      "text-black": !active,
                    })}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
            Meal Reminders
          </Text>
          <View className="flex-row rounded-full border-2 border-black p-1">
            {[true, false].map((value) => {
              const active = mealReminders === value;
              return (
                <Pressable
                  key={String(value)}
                  onPress={() =>
                    dispatch(updateOnboardingData({ mealReminders: value }))
                  }
                  className={`flex-1 items-center rounded-full py-3 ${
                    active ? "bg-black" : "bg-white"
                  }`}
                >
                  <Text
                    className={`font-dmsans-bold text-sm ${
                      active ? "text-white" : "text-black"
                    }`}
                  >
                    {value ? "YES" : "NO"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </OnboardingShell>
  );
};

export default StepSevenScreen;
