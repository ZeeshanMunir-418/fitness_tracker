import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSession } from "@/store/slices/authSlice";
import {
  prevStep,
  resetOnboarding,
  saveOnboardingProfile,
} from "@/store/slices/onboardingSlice";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Text,
  View,
} from "react-native";

// ── helpers ──────────────────────────────────────────────────────────────────

const toKg = (weight: number, unit: "kg" | "lbs") =>
  unit === "kg" ? weight : weight * 0.453592;

const toCm = (height: number, unit: "cm" | "ft") =>
  unit === "cm" ? height : height * 30.48;

// One entry per progressStep (0 = idle, never shown; 5 = done)
const PROGRESS_STAGES: Record<
  number,
  { label: string; sub: string; percent: number }
> = {
  1: {
    label: "Verifying your session",
    sub: "Making sure everything is secure…",
    percent: 10,
  },
  2: {
    label: "Uploading your photo",
    sub: "Adding your profile picture…",
    percent: 25,
  },
  3: {
    label: "Saving your profile",
    sub: "Storing your goals and preferences…",
    percent: 45,
  },
  4: {
    label: "Building your plans",
    sub: "Generating your personalised workout & meal plan…",
    percent: 70,
  },
  5: {
    label: "Almost there!",
    sub: "Putting the finishing touches on your journey…",
    percent: 100,
  },
};

// ── animated progress bar ────────────────────────────────────────────────────

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
      style={{
        height: 6,
        borderRadius: 999,
        backgroundColor: trackColor,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <Animated.View
        style={{
          height: "100%",
          width,
          backgroundColor: color,
          borderRadius: 999,
        }}
      />
    </View>
  );
}

// ── main screen ──────────────────────────────────────────────────────────────

const StepEightScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { data, loading, error, progressStep } = useAppSelector(
    (s) => s.onboarding,
  );
  const session = useAppSelector((s) => s.auth.session);

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

    return {
      bmi: bmiValue,
      bmr: bmrValue,
      calories: bmrValue * factor,
    };
  }, [data]);

  // ── once thunk completes (progressStep === 5), re-check onboarding
  //    status from Supabase so _layout cache is warm, then navigate ──────────
  useEffect(() => {
    if (progressStep !== 5 || loading) return;

    let active = true;

    const finish = async () => {
      // Hold on "Almost there!" frame so it's readable before transitioning
      await new Promise((r) => setTimeout(r, 800));
      if (!active) return;

      // Re-fetch session so Redux is fully up to date before nav guard runs
      const { data: sd } = await supabase.auth.getSession();
      if (sd?.session && active) {
        dispatch(setSession({ user: sd.session.user, session: sd.session }));
      }

      if (!active) return;

      // ✅ Navigate FIRST — /(tabs) must be mounted before we wipe onboarding
      // state, otherwise the brief currentStep: 1 reset flashes step-1 on screen.
      router.replace("/(tabs)");

      // ✅ Reset AFTER nav settles — 500 ms gives the new screen time to fully
      // mount and the onboarding stack to unmount before Redux state is cleared.
      setTimeout(() => {
        if (active) dispatch(resetOnboarding());
      }, 500);
    };

    finish();

    // ✅ Cleanup is on the useEffect return, NOT inside finish()
    return () => {
      active = false;
    };
  }, [progressStep, loading, dispatch, router]);

  const handleFinish = async () => {
    await dispatch(saveOnboardingProfile());
    // Navigation is handled in the effect above once progressStep hits 5.
    // If rejected the overlay auto-closes (progressStep resets to 0 in slice).
  };

  const stats = [
    { label: "BMI", value: bmi > 0 ? bmi.toFixed(1) : "--" },
    { label: "BMR", value: bmr > 0 ? Math.round(bmr).toString() : "--" },
    {
      label: "Daily Calories",
      value: calories > 0 ? Math.round(calories).toString() : "--",
    },
  ];

  const stage = PROGRESS_STAGES[progressStep];
  const showOverlay = loading || progressStep === 5;

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

        {/* Inline error (only shown when overlay is closed) */}
        {error ? (
          <Text
            style={{ color: "#ef4444", marginTop: 12 }}
            className="font-dmsans text-sm text-center"
          >
            {error}
          </Text>
        ) : null}
      </OnboardingShell>

      {/* ── Progress overlay ─────────────────────────────────────────────── */}
      <Modal visible={showOverlay} transparent animationType="fade">
        {/* dark scrim */}
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 2,
              borderRadius: 28,
              padding: 32,
              width: "100%",
              alignItems: "center",
              gap: 20,
            }}
          >
            {/* Spinner */}
            <ActivityIndicator size="large" color={colors.text} />

            {/* Label */}
            <View style={{ alignItems: "center", gap: 6 }}>
              <Text
                style={{ color: colors.text }}
                className="font-dmsans-bold text-xl text-center"
              >
                {stage?.label ?? "Please wait…"}
              </Text>
              <Text
                style={{ color: colors.textMuted }}
                className="font-dmsans text-sm text-center"
              >
                {stage?.sub ?? ""}
              </Text>
            </View>

            {/* Animated progress bar */}
            <View style={{ width: "100%", gap: 8 }}>
              <ProgressBar
                percent={stage?.percent ?? 0}
                color={colors.text}
                trackColor={colors.border}
              />
              <Text
                style={{ color: colors.textMuted, alignSelf: "flex-end" }}
                className="font-dmsans text-xs"
              >
                {stage?.percent ?? 0}%
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default StepEightScreen;
