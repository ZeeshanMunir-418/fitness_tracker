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

const StepFiveScreen = () => {
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
      <View style={{ gap: 24 }}>
        {/* ── Dietary Preference ───────────────────────────────────────── */}
        <View style={{ gap: 8 }}>
          <Text
            style={{ color: colors.textMuted }}
            className="font-dmsans text-xs uppercase tracking-widest"
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
                      updateOnboardingData({
                        dietaryPreference: option.value,
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

        {/* ── Daily Water Goal ─────────────────────────────────────────── */}
        <View
          style={{
            borderRadius: 24,
            borderWidth: 2,
            borderColor: colors.border,
            padding: 20,
            gap: 12,
          }}
        >
          <Text
            style={{ color: colors.text }}
            className="font-dmsans-bold text-base"
          >
            Daily Water Goal
          </Text>
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => adjustWater(-0.25)}
              style={{
                height: 48,
                width: 48,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ color: colors.text }}
                className="font-dmsans-bold text-xl"
              >
                −
              </Text>
            </Pressable>
            <Text
              style={{ color: colors.text }}
              className="font-dmsans-bold text-2xl"
            >
              {dailyWaterGoalLiters.toFixed(2)}L
            </Text>
            <Pressable
              onPress={() => adjustWater(0.25)}
              style={{
                height: 48,
                width: 48,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ color: colors.text }}
                className="font-dmsans-bold text-xl"
              >
                +
              </Text>
            </Pressable>
          </View>
          <Text
            style={{ color: colors.textMuted }}
            className="font-dmsans text-xs text-center"
          >
            Range: 0.5L to 5L (0.25L increments)
          </Text>
        </View>

        {/* ── Track Calories ───────────────────────────────────────────── */}
        <View style={{ gap: 8 }}>
          <Text
            style={{ color: colors.textMuted }}
            className="font-dmsans text-xs uppercase tracking-widest"
          >
            Track Calories
          </Text>
          <View
            style={{
              flexDirection: "row",
              borderRadius: 999,
              borderWidth: 2,
              borderColor: colors.border,
              padding: 4,
            }}
          >
            {[true, false].map((value) => {
              const active = tracksCalories === value;
              return (
                <Pressable
                  key={String(value)}
                  onPress={() =>
                    dispatch(updateOnboardingData({ tracksCalories: value }))
                  }
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 12,
                    borderRadius: 999,
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
