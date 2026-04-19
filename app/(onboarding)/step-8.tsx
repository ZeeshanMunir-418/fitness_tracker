import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSession } from "@/store/slices/authSlice";
import {
  generateWorkoutPlan,
  prevStep,
  resetOnboarding,
  saveOnboardingProfile,
} from "@/store/slices/onboardingSlice";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── helpers ───────────────────────────────────────────────────────────────────

const toKg = (weight: number, unit: "kg" | "lbs") =>
  unit === "kg" ? weight : weight * 0.453592;

const toCm = (height: number, unit: "cm" | "ft") =>
  unit === "cm" ? height : height * 30.48;

// Steps 1-3 block the UI. Step 4 = profile saved → navigate immediately.
// Plan generation is kicked off after profile save and reflected in the UI.
const PROGRESS_STAGES: Record<
  number,
  { label: string; sub: string; percent: number }
> = {
  1: {
    label: "Verifying your session",
    sub: "Making sure everything is secure…",
    percent: 15,
  },
  2: {
    label: "Uploading your photo",
    sub: "Adding your profile picture…",
    percent: 40,
  },
  3: {
    label: "Saving your profile",
    sub: "Storing your goals and preferences…",
    percent: 75,
  },
  4: {
    label: "All done!",
    sub: "Taking you to the app…",
    percent: 100,
  },
};

const SOFT_DEPTH_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.12,
  shadowRadius: 18,
  elevation: 14,
} as const;

function ProgressBar({
  percent,
  color,
  trackColor,
}: {
  percent: number;
  color: string;
  trackColor: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: percent,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      className="h-1.5 w-full overflow-hidden rounded-full"
      style={{
        backgroundColor: trackColor,
      }}
    >
      <Animated.View
        className="h-full rounded-full"
        style={{
          width,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function SpinningLoader({ color }: { color: string }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <ActivityIndicator size="small" color={color} />
    </Animated.View>
  );
}

const StepEightScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    data,
    loading,
    error,
    onboardingComplete,
    progressStep,
    planGenerationLoading,
    planGenerationProgress,
    planGenerationMessage,
    planGenerationError,
  } = useAppSelector((s) => s.onboarding);
  const hasStartedPlanGenerationRef = useRef(false);
  const hasNavigatedRef = useRef(false);
  const [hideProgressDock, setHideProgressDock] = useState(false);

  const { bmi, bmr, calories } = useMemo(() => {
    const weightKg = data.currentWeight
      ? Number(toKg(data.currentWeight, data.weightUnit))
      : 0;

    const heightCm = data.height
      ? Number(toCm(data.height, data.heightUnit))
      : 0;

    const age = Number.isFinite(data.age) ? data.age! : 30;

    if (weightKg <= 0 || heightCm <= 0) {
      return { bmi: 0, bmr: 0, calories: 0 };
    }

    // --- BMI ---
    const heightM = heightCm / 100;
    const bmiValue = weightKg / (heightM * heightM);

    // --- BMR (Mifflin-St Jeor Equation — most accurate clinically) ---
    const isFemale = data.gender === "female";

    const bmrValue =
      10 * weightKg + 6.25 * heightCm - 5 * age + (isFemale ? -161 : 5);

    // --- Activity Multipliers ---
    const activityFactorMap: Record<string, number> = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      athlete: 1.9,
    };

    const factor = activityFactorMap[data.activityLevel ?? "sedentary"] ?? 1.2;

    const caloriesValue = bmrValue * factor;

    return {
      bmi: Number(bmiValue.toFixed(2)),
      bmr: Math.round(bmrValue),
      calories: Math.round(caloriesValue),
    };
  }, [
    data.currentWeight,
    data.weightUnit,
    data.height,
    data.heightUnit,
    data.age,
    data.gender,
    data.activityLevel,
  ]);

  useEffect(() => {
    const isCompleted =
      onboardingComplete &&
      progressStep === 4 &&
      !loading &&
      !planGenerationLoading;

    if (!isCompleted) {
      setHideProgressDock(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setHideProgressDock(true);
    }, 2500);

    return () => clearTimeout(timeoutId);
  }, [onboardingComplete, loading, planGenerationLoading, progressStep]);

  useEffect(() => {
    if (progressStep !== 4 || loading || hasStartedPlanGenerationRef.current) {
      return;
    }

    hasStartedPlanGenerationRef.current = true;

    let active = true;

    const finish = async () => {
      // Brief pause so profile completion stage is readable before AI plan starts.
      await new Promise((r) => setTimeout(r, 600));
      if (!active) return;

      const { data: sd } = await supabase.auth.getSession();
      if (sd?.session && active) {
        dispatch(setSession({ user: sd.session.user, session: sd.session }));
      }
      if (!active) return;
      const profilePayload: Record<string, unknown> = {
        id: sd?.session?.user?.id,
        primary_goal: data.primaryGoal,
        activity_level: data.activityLevel,
        preferred_workout_type: data.preferredWorkoutType,
        workout_duration: data.workoutDuration,
        workout_days_per_week: data.workoutDaysPerWeek,
        age: data.age,
        gender: data.gender,
        current_weight: data.currentWeight,
        weight_unit: data.weightUnit,
        height: data.height,
        height_unit: data.heightUnit,
      };

      void dispatch(generateWorkoutPlan(profilePayload));
    };

    void finish();

    return () => {
      active = false;
    };
  }, [progressStep, loading, dispatch, router, data]);

  useEffect(() => {
    if (progressStep !== 4 || hasNavigatedRef.current) {
      return;
    }

    hasNavigatedRef.current = true;

    const timeoutId = setTimeout(() => {
      router.replace("/(tabs)");

      setTimeout(() => {
        dispatch(resetOnboarding());
      }, 400);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [dispatch, progressStep, router]);

  const handleFinish = async () => {
    await dispatch(saveOnboardingProfile());
  };

  const stats = [
    { label: "BMI", value: bmi > 0 ? bmi.toFixed(1) : "--" },
    { label: "BMR", value: bmr > 0 ? Math.round(bmr).toString() : "--" },
    {
      label: "Daily Calories",
      value: calories > 0 ? Math.round(calories).toString() : "--",
    },
  ];

  const profileStage = PROGRESS_STAGES[progressStep] ?? null;
  const profilePercent = profileStage?.percent ?? 0;
  const aiPercent = planGenerationProgress;
  const showProgressDock =
    !hideProgressDock &&
    (loading || progressStep > 0 || planGenerationLoading || aiPercent > 0);

  const headline =
    planGenerationLoading || aiPercent > 0
      ? "Your AI coach is building your personalized plan."
      : loading || progressStep > 0
        ? "Finishing your profile setup."
        : "You're all set. Let's get to work.";

  return (
    <>
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
        <View className="mb-2 items-center">
          <Image
            source={require("@/assets/images/ghost-mascot.png")}
            className="h-32 w-32"
            resizeMode="contain"
          />
        </View>

        {/* Stat cards */}
        <View className="mt-3 flex-row gap-2">
          {stats.map((stat) => (
            <View
              key={stat.label}
              className="flex-1 items-center rounded-3xl border-2 p-4"
              style={{
                borderColor: colors.border,
              }}
            >
              <Text
                style={{ color: colors.text }}
                className="font-dmsans-bold text-xl text-center"
              >
                {stat.value}
              </Text>
              <Text
                style={{ color: colors.textMuted }}
                className="mt-1 font-dmsans text-xs text-center"
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Headline */}
        <Text
          style={{ color: colors.text }}
          className="mt-6 font-dmsans-bold text-lg text-center"
        >
          {headline}
        </Text>

        {/* Profile summary */}
        <View
          className="mt-5 gap-2.5 rounded-[20px] border-2 p-4"
          style={{
            borderColor: colors.cardBorder,
            backgroundColor: colors.card,
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
              value:
                (data.workoutDuration?.replace(/_/g, "-") ?? "--") + " min",
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
              className="flex-row items-center justify-between"
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

        {error ? (
          <Text
            style={{ color: "#ef4444" }}
            className="mt-3 font-dmsans text-sm text-center"
          >
            {error}
          </Text>
        ) : null}

        {planGenerationError ? (
          <Text
            style={{ color: "#ef4444" }}
            className="mt-2 font-dmsans text-sm text-center"
          >
            {planGenerationError}
          </Text>
        ) : null}

        <View className="h-44" />
      </OnboardingShell>

      {showProgressDock ? (
        <View
          pointerEvents="none"
          className="rounded-3xl border-2 px-4 py-4"
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: insets.bottom + 14,
            zIndex: 20,
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            ...SOFT_DEPTH_SHADOW,
          }}
        >
          <View className="mb-3 flex-row items-center justify-between">
            <Text
              style={{ color: colors.text }}
              className="font-dmsans-bold text-sm"
            >
              Profile Completion
            </Text>
            <View className="flex-row items-center gap-2">
              {loading || progressStep > 0 ? (
                <SpinningLoader color={colors.text} />
              ) : null}
              <Text
                style={{ color: colors.textMuted }}
                className="font-dmsans text-xs"
              >
                {Math.round(profilePercent)}%
              </Text>
            </View>
          </View>
          <ProgressBar
            percent={profilePercent}
            color={colors.text}
            trackColor={colors.cardBorder}
          />
          {profileStage ? (
            <Text
              style={{ color: colors.textMuted }}
              className="mt-2 font-dmsans text-xs"
            >
              {profileStage.sub}
            </Text>
          ) : null}

          <View
            className="my-3"
            style={{ borderTopWidth: 1, borderColor: colors.cardBorder }}
          />

          <View className="mb-3 flex-row items-center justify-between">
            <Text
              style={{ color: colors.text }}
              className="font-dmsans-bold text-sm"
            >
              Workout Plan Generation
            </Text>
            <View className="flex-row items-center gap-2">
              {planGenerationLoading ? (
                <SpinningLoader color={colors.text} />
              ) : null}
              <Text
                style={{ color: colors.textMuted }}
                className="font-dmsans text-xs"
              >
                {Math.round(aiPercent)}%
              </Text>
            </View>
          </View>
          <ProgressBar
            percent={aiPercent}
            color={colors.text}
            trackColor={colors.cardBorder}
          />
          <Text
            style={{ color: colors.textMuted }}
            className="mt-2 font-dmsans text-xs"
          >
            {planGenerationMessage || "Waiting for profile completion..."}
          </Text>
        </View>
      ) : null}
    </>
  );
};

export default StepEightScreen;
