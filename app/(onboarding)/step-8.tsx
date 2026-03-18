import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  prevStep,
  resetOnboarding,
  saveOnboardingProfile,
} from "@/store/slices/onboardingSlice";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";

const toKg = (weight: number, unit: "kg" | "lbs") =>
  unit === "kg" ? weight : weight * 0.453592;

const toCm = (height: number, unit: "cm" | "ft") =>
  unit === "cm" ? height : height * 30.48;

const StepEightScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { data, loading, error } = useAppSelector((s) => s.onboarding);

  const { bmi, bmr, calories } = useMemo(() => {
    const weightKg = data.currentWeight
      ? toKg(data.currentWeight, data.weightUnit)
      : 0;
    const heightCm = data.height ? toCm(data.height, data.heightUnit) : 0;
    const age = data.age ?? 30;

    const bmiValue =
      weightKg > 0 && heightCm > 0 ? weightKg / Math.pow(heightCm / 100, 2) : 0;

    const isFemale = data.gender === "female";
    const bmrValue =
      weightKg > 0 && heightCm > 0
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + (isFemale ? -161 : 5)
        : 0;

    const activityFactorMap = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      athlete: 1.9,
    } as const;

    const factor = data.activityLevel
      ? activityFactorMap[data.activityLevel]
      : 1.2;
    const dailyCalories = bmrValue * factor;

    return { bmi: bmiValue, bmr: bmrValue, calories: dailyCalories };
  }, [data]);

  const handleFinish = async () => {
    const result = await dispatch(saveOnboardingProfile());
    if (saveOnboardingProfile.fulfilled.match(result)) {
      dispatch(resetOnboarding());
      router.replace("/(tabs)");
    }
  };

  const stats = [
    { label: "BMI", value: bmi > 0 ? bmi.toFixed(1) : "--" },
    { label: "BMR", value: bmr > 0 ? Math.round(bmr).toString() : "--" },
    {
      label: "Daily Calories",
      value: calories > 0 ? Math.round(calories).toString() : "--",
    },
  ];

  return (
    <OnboardingShell
      step={8}
      totalSteps={8}
      title="Summary"
      subtitle="Your plan is personalized and ready to launch."
      onBack={() => {
        dispatch(prevStep());
        router.back();
      }}
      onNext={handleFinish}
      nextLabel="START MY JOURNEY"
      nextDisabled={loading}
    >
      {/* Mascot */}
      <View style={{ alignItems: "center", marginBottom: 8 }}>
        <Image
          source={require("@/assets/images/ghost-mascot.png")}
          style={{ height: 128, width: 128 }}
          resizeMode="contain"
        />
      </View>

      {/* Stat cards */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={{
              flex: 1,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: colors.border,
              padding: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: colors.text }}
              className="font-dmsans-bold text-xl text-center"
            >
              {stat.value}
            </Text>
            <Text
              style={{ color: colors.textMuted, marginTop: 4 }}
              className="font-dmsans text-xs text-center"
            >
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Headline */}
      <Text
        style={{ color: colors.text, marginTop: 24 }}
        className="font-dmsans-bold text-lg text-center"
      >
        You're all set. Let's get to work.
      </Text>

      {/* Profile summary */}
      <View
        style={{
          marginTop: 20,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: colors.cardBorder,
          backgroundColor: colors.card,
          padding: 16,
          gap: 10,
        }}
      >
        {[
          {
            label: "Goal",
            value: data.primaryGoal?.replace(/_/g, " ") ?? "--",
          },
          {
            label: "Activity",
            value: data.activityLevel?.replace(/_/g, " ") ?? "--",
          },
          {
            label: "Workout Type",
            value: data.preferredWorkoutType?.replace(/_/g, " ") ?? "--",
          },
          {
            label: "Duration",
            value: (data.workoutDuration?.replace(/_/g, "-") ?? "--") + " min",
          },
          {
            label: "Days / Week",
            value: data.workoutDaysPerWeek?.toString() ?? "--",
          },
          {
            label: "Diet",
            value: data.dietaryPreference?.replace(/_/g, " ") ?? "--",
          },
        ].map((row) => (
          <View
            key={row.label}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: colors.textMuted }}
              className="font-dmsans text-sm"
            >
              {row.label}
            </Text>
            <Text
              style={{ color: colors.text }}
              className="font-dmsans-bold text-sm capitalize"
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Loading */}
      {loading ? (
        <View style={{ marginTop: 16, alignItems: "center" }}>
          <ActivityIndicator color={colors.text} />
          <Text
            style={{ color: colors.textMuted, marginTop: 8 }}
            className="font-dmsans text-sm"
          >
            Generating your plan...
          </Text>
        </View>
      ) : null}

      {/* Error */}
      {error ? (
        <Text
          style={{ color: "#ef4444", marginTop: 12 }}
          className="font-dmsans text-sm text-center"
        >
          {error}
        </Text>
      ) : null}
    </OnboardingShell>
  );
};

export default StepEightScreen;
