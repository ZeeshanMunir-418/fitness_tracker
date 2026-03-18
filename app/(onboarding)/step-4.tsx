import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { useTheme } from "@/lib/theme/ThemeContext";
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
  const { colors } = useTheme();
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
      <View style={{ gap: 24 }}>
        {/* ── Workout Type ─────────────────────────────────────────────── */}
        <View style={{ gap: 8 }}>
          <Text
            style={{ color: colors.textMuted }}
            className="font-dmsans text-xs uppercase tracking-widest"
          >
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
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: active ? colors.border : colors.borderMuted,
                    backgroundColor: active ? colors.text : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.background : colors.text,
                      fontSize: 13,
                    }}
                    className="font-dmsans-bold"
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Session Duration ─────────────────────────────────────────── */}
        <View style={{ gap: 8 }}>
          <Text
            style={{ color: colors.textMuted }}
            className="font-dmsans text-xs uppercase tracking-widest"
          >
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
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: active ? colors.border : colors.borderMuted,
                    backgroundColor: active ? colors.text : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.background : colors.text,
                      fontSize: 13,
                    }}
                    className="font-dmsans-bold"
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Days Per Week ────────────────────────────────────────────── */}
        <View style={{ gap: 8 }}>
          <Text
            style={{ color: colors.textMuted }}
            className="font-dmsans text-xs uppercase tracking-widest"
          >
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
                  style={{
                    height: 44,
                    width: 44,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: active ? colors.border : colors.borderMuted,
                    backgroundColor: active ? colors.text : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.background : colors.text,
                      fontSize: 13,
                    }}
                    className="font-dmsans-bold"
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
