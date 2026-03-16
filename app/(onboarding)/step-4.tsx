import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    nextStep,
    prevStep,
    updateOnboardingData,
} from "@/store/slices/onboardingSlice";
import { Href, useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

const workoutTypes = [
  { label: "Strength Training", value: "strength_training" as const },
  { label: "Cardio", value: "cardio" as const },
  { label: "HIIT", value: "hiit" as const },
  { label: "Yoga & Flexibility", value: "yoga_flexibility" as const },
  { label: "Mixed", value: "mixed" as const },
];

const durations = [
  { label: "15-30 min", value: "15_30" as const },
  { label: "30-45 min", value: "30_45" as const },
  { label: "45-60 min", value: "45_60" as const },
  { label: "60+ min", value: "60_plus" as const },
];

const StepFourScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { preferredWorkoutType, workoutDuration, workoutDaysPerWeek } =
    useAppSelector((s) => s.onboarding.data);

  const nextDisabled =
    !preferredWorkoutType || !workoutDuration || !workoutDaysPerWeek;

  return (
    <OnboardingShell
      step={4}
      totalSteps={8}
      title="Workout Preferences"
      subtitle="Pick how you like to train each week."
      onBack={() => {
        dispatch(prevStep());
        router.back();
      }}
      onNext={() => {
        dispatch(nextStep());
        router.push("/(onboarding)/step-5" as Href);
      }}
      nextDisabled={nextDisabled}
    >
      <View className="gap-6">
        <View className="gap-2">
          <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
            Workout Type
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {workoutTypes.map((option) => {
              const active = preferredWorkoutType === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    dispatch(
                      updateOnboardingData({
                        preferredWorkoutType: option.value,
                      }),
                    )
                  }
                  className={`rounded-full px-4 py-3 ${
                    active ? "bg-black" : "border-2 border-black bg-white"
                  }`}
                >
                  <Text
                    className={`font-dmsans-bold text-sm ${
                      active ? "text-white" : "text-black"
                    }`}
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
            Session Duration
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {durations.map((option) => {
              const active = workoutDuration === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    dispatch(
                      updateOnboardingData({ workoutDuration: option.value }),
                    )
                  }
                  className={`rounded-full px-4 py-3 ${
                    active ? "bg-black" : "border-2 border-black bg-white"
                  }`}
                >
                  <Text
                    className={`font-dmsans-bold text-sm ${
                      active ? "text-white" : "text-black"
                    }`}
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
            Workout Days Per Week
          </Text>
          <View className="flex-row items-center justify-between">
            {Array.from({ length: 7 }, (_, index) => {
              const day = index + 1;
              const active = workoutDaysPerWeek === day;
              return (
                <Pressable
                  key={day}
                  onPress={() =>
                    dispatch(updateOnboardingData({ workoutDaysPerWeek: day }))
                  }
                  className={`h-11 w-11 items-center justify-center rounded-full ${
                    active ? "bg-black" : "border-2 border-black bg-white"
                  }`}
                >
                  <Text
                    className={`font-dmsans-bold text-sm ${
                      active ? "text-white" : "text-black"
                    }`}
                  >
                    {day}
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

export default StepFourScreen;
