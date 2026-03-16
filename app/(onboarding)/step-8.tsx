import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
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

    return {
      bmi: bmiValue,
      bmr: bmrValue,
      calories: dailyCalories,
    };
  }, [data]);

  const handleFinish = async () => {
    const result = await dispatch(saveOnboardingProfile());
    if (saveOnboardingProfile.fulfilled.match(result)) {
      dispatch(resetOnboarding());
      router.replace("/(tabs)");
    }
  };

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
      <View className="items-center">
        <Image
          source={require("@/assets/images/ghost-mascot.png")}
          className="h-32 w-32"
          resizeMode="contain"
        />
      </View>

      <View className="mt-5 flex-row gap-2">
        {[
          { label: "BMI", value: bmi > 0 ? bmi.toFixed(1) : "--" },
          { label: "BMR", value: bmr > 0 ? Math.round(bmr).toString() : "--" },
          {
            label: "Daily Calories",
            value: calories > 0 ? Math.round(calories).toString() : "--",
          },
        ].map((stat) => (
          <View
            key={stat.label}
            className="flex-1 rounded-3xl border-2 border-black p-4"
          >
            <Text className="text-center font-dmsans-bold text-xl text-black">
              {stat.value}
            </Text>
            <Text className="mt-1 text-center font-dmsans text-xs text-neutral-500">
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      <Text className="mt-6 text-center font-dmsans-bold text-lg text-black">
        You&apos;re all set. Let&apos;s get to work.
      </Text>

      {loading ? (
        <View className="mt-4 items-center">
          <ActivityIndicator color="#000" />
        </View>
      ) : null}

      {error ? (
        <Text className="mt-4 text-center font-dmsans text-sm text-black">
          {error}
        </Text>
      ) : null}
    </OnboardingShell>
  );
};

export default StepEightScreen;
