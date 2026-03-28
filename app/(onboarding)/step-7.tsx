import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    nextStep,
    prevStep,
    updateOnboardingData,
} from "@/store/slices/onboardingSlice";
import { Href, useRouter } from "expo-router";
import { Clock, Moon, Sun, Sunrise } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

const timeOptions = [
  { label: "Morning", value: "morning" as const, Icon: Sunrise },
  { label: "Afternoon", value: "afternoon" as const, Icon: Sun },
  { label: "Evening", value: "evening" as const, Icon: Moon },
];

const StepSevenScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
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
        {/* ── Workout Reminders ────────────────────────────────────────── */}
        <View className="gap-2">
          <Text
            style={{ color: colors.textMuted }}
            className="font-dmsans text-xs uppercase tracking-widest"
          >
            Workout Reminders
          </Text>
          <View
            className="flex-row rounded-full border-2 p-1"
            style={{
              borderColor: colors.border,
            }}
          >
            {[true, false].map((value) => {
              const active = workoutReminders === value;
              return (
                <Pressable
                  key={String(value)}
                  onPress={() =>
                    dispatch(updateOnboardingData({ workoutReminders: value }))
                  }
                  className="flex-1 items-center justify-center rounded-full py-3"
                  style={{
                    backgroundColor: active ? colors.text : "transparent",
                  }}
                >
                  <Text
                    style={{ color: active ? colors.background : colors.text }}
                    className="font-dmsans-bold text-[13px]"
                  >
                    {value ? "YES" : "NO"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Preferred Workout Time ───────────────────────────────────── */}
        <View className="gap-2">
          <Text
            style={{ color: colors.textMuted }}
            className="font-dmsans text-xs uppercase tracking-widest"
          >
            Preferred Workout Time
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {timeOptions.map(({ label, value, Icon }) => {
              const active = preferredWorkoutTime === value;
              return (
                <Pressable
                  key={value}
                  onPress={() =>
                    dispatch(
                      updateOnboardingData({ preferredWorkoutTime: value }),
                    )
                  }
                  className="flex-row items-center gap-2 rounded-full border-2 px-4 py-3"
                  style={{
                    borderColor: active ? colors.border : colors.borderMuted,
                    backgroundColor: active ? colors.text : "transparent",
                  }}
                >
                  <Icon
                    size={16}
                    color={active ? colors.background : colors.text}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={{ color: active ? colors.background : colors.text }}
                    className="font-dmsans-bold text-[13px]"
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Meal Reminders ───────────────────────────────────────────── */}
        <View className="gap-2">
          <Text
            style={{ color: colors.textMuted }}
            className="font-dmsans text-xs uppercase tracking-widest"
          >
            Meal Reminders
          </Text>
          <View
            className="flex-row rounded-full border-2 p-1"
            style={{
              borderColor: colors.border,
            }}
          >
            {[true, false].map((value) => {
              const active = mealReminders === value;
              return (
                <Pressable
                  key={String(value)}
                  onPress={() =>
                    dispatch(updateOnboardingData({ mealReminders: value }))
                  }
                  className="flex-1 items-center justify-center rounded-full py-3"
                  style={{
                    backgroundColor: active ? colors.text : "transparent",
                  }}
                >
                  <Text
                    style={{ color: active ? colors.background : colors.text }}
                    className="font-dmsans-bold text-[13px]"
                  >
                    {value ? "YES" : "NO"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Info card ────────────────────────────────────────────────── */}
        <View
          className="flex-row items-start gap-3 rounded-2xl border-2 p-4"
          style={{
            borderColor: colors.cardBorder,
            backgroundColor: colors.card,
          }}
        >
          <Clock size={16} color={colors.textMuted} strokeWidth={1.5} />
          <Text
            style={{ color: colors.textMuted }}
            className="flex-1 font-dmsans text-xs leading-5"
          >
            Reminders are sent based on your preferred workout time. You can
            change these any time in notification settings.
          </Text>
        </View>
      </View>
    </OnboardingShell>
  );
};

export default StepSevenScreen;
