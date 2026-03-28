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

const dietaryOptions = [
  { label: "No Restriction", value: "no_restriction" as const },
  { label: "Vegetarian", value: "vegetarian" as const },
  { label: "Vegan", value: "vegan" as const },
  { label: "Halal", value: "halal" as const },
  { label: "Keto", value: "keto" as const },
  { label: "High Protein", value: "high_protein" as const },
];

export const StepFiveScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { dietaryPreference, dailyWaterGoalLiters, tracksCalories } =
    useAppSelector((s) => s.onboarding.data);

  const adjustWater = (delta: number) => {
    const next = Math.min(
      5,
      Math.max(0.5, Number((dailyWaterGoalLiters + delta).toFixed(2))),
    );
    dispatch(updateOnboardingData({ dailyWaterGoalLiters: next }));
  };

  return (
    <OnboardingShell
      step={5}
      totalSteps={8}
      title="Nutrition Preferences"
      subtitle="Set how you want to approach your nutrition habits."
      onBack={() => {
        dispatch(prevStep());
        router.back();
      }}
      onNext={() => {
        dispatch(nextStep());
        router.push("/(onboarding)/step-6" as Href);
      }}
      nextDisabled={!dietaryPreference}
    >
      <View className="gap-6">
        {/* ── Dietary Preference ───────────────────────────────────────── */}
        <View className="gap-2">
          <Text
            className="font-dmsans text-xs uppercase tracking-widest"
            style={{ color: colors.textMuted }}
          >
            Dietary Preference
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {dietaryOptions.map((option) => {
              const active = dietaryPreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    dispatch(
                      updateOnboardingData({ dietaryPreference: option.value }),
                    )
                  }
                  className="rounded-full border-2 px-4 py-3"
                  style={{
                    borderColor: active ? colors.border : colors.borderMuted,
                    backgroundColor: active ? colors.text : "transparent",
                  }}
                >
                  <Text
                    className="font-dmsans-bold text-[13px]"
                    style={{ color: active ? colors.background : colors.text }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Daily Water Goal ─────────────────────────────────────────── */}
        <View
          className="gap-3 rounded-3xl border-2 p-5"
          style={{ borderColor: colors.border }}
        >
          <Text
            className="font-dmsans-bold text-base"
            style={{ color: colors.text }}
          >
            Daily Water Goal
          </Text>
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => adjustWater(-0.25)}
              className="h-12 w-12 items-center justify-center rounded-full border-2"
              style={{ borderColor: colors.border }}
            >
              <Text
                className="font-dmsans-bold text-xl"
                style={{ color: colors.text }}
              >
                −
              </Text>
            </Pressable>
            <Text
              className="font-dmsans-bold text-2xl"
              style={{ color: colors.text }}
            >
              {dailyWaterGoalLiters.toFixed(2)}L
            </Text>
            <Pressable
              onPress={() => adjustWater(0.25)}
              className="h-12 w-12 items-center justify-center rounded-full border-2"
              style={{ borderColor: colors.border }}
            >
              <Text
                className="font-dmsans-bold text-xl"
                style={{ color: colors.text }}
              >
                +
              </Text>
            </Pressable>
          </View>
          <Text
            className="text-center font-dmsans text-xs"
            style={{ color: colors.textMuted }}
          >
            Range: 0.5L to 5L (0.25L increments)
          </Text>
        </View>

        {/* ── Track Calories ───────────────────────────────────────────── */}
        <View className="gap-2">
          <Text
            className="font-dmsans text-xs uppercase tracking-widest"
            style={{ color: colors.textMuted }}
          >
            Track Calories
          </Text>
          <View
            className="flex-row rounded-full border-2 p-1"
            style={{ borderColor: colors.border }}
          >
            {([true, false] as const).map((value) => {
              const active = tracksCalories === value;
              return (
                <Pressable
                  key={String(value)}
                  onPress={() =>
                    dispatch(updateOnboardingData({ tracksCalories: value }))
                  }
                  className="flex-1 items-center justify-center rounded-full py-3"
                  style={{
                    backgroundColor: active ? colors.text : "transparent",
                  }}
                >
                  <Text
                    className="font-dmsans-bold text-[13px]"
                    style={{ color: active ? colors.background : colors.text }}
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

export default StepFiveScreen;
