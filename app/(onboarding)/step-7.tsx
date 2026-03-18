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
      <View style={{ gap: 24 }}>
        {/* ── Workout Reminders ────────────────────────────────────────── */}
        <View style={{ gap: 8 }}>
          <Text
            style={{ color: colors.textMuted }}
            className="font-dmsans text-xs uppercase tracking-widest"
          >
            Workout Reminders
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
              const active = workoutReminders === value;
              return (
                <Pressable
                  key={String(value)}
                  onPress={() =>
                    dispatch(updateOnboardingData({ workoutReminders: value }))
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

        {/* ── Preferred Workout Time ───────────────────────────────────── */}
        <View style={{ gap: 8 }}>
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
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 999,
                    borderWidth: 2,
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
                    style={{
                      color: active ? colors.background : colors.text,
                      fontSize: 13,
                    }}
                    className="font-dmsans-bold"
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Meal Reminders ───────────────────────────────────────────── */}
        <View style={{ gap: 8 }}>
          <Text
            style={{ color: colors.textMuted }}
            className="font-dmsans text-xs uppercase tracking-widest"
          >
            Meal Reminders
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
              const active = mealReminders === value;
              return (
                <Pressable
                  key={String(value)}
                  onPress={() =>
                    dispatch(updateOnboardingData({ mealReminders: value }))
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

        {/* ── Info card ────────────────────────────────────────────────── */}
        <View
          style={{
            borderRadius: 16,
            borderWidth: 2,
            borderColor: colors.cardBorder,
            backgroundColor: colors.card,
            padding: 16,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <Clock size={16} color={colors.textMuted} strokeWidth={1.5} />
          <Text
            style={{ color: colors.textMuted, flex: 1 }}
            className="font-dmsans text-xs leading-5"
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
