import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { Button } from "@/components/ui/button";
import { CustomDatePicker } from "@/components/ui/date-picker";
import Input from "@/components/ui/input";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  nextStep,
  prevStep,
  updateOnboardingData,
} from "@/store/slices/onboardingSlice";
import { Href, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

const weeklyOptions = [
  { label: "- 1kg", value: -1 },
  { label: "- 0.75kg", value: -0.75 },
  { label: "- 0.5kg", value: -0.5 },
  { label: "- 0.25kg", value: -0.25 },
  { label: "Maintain", value: 0 },
  { label: "+ 0.5kg", value: 0.5 },
];

const StepSixScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { targetWeight, targetDate, weeklyWeightChangeKg, weightUnit } =
    useAppSelector((s) => s.onboarding.data);

  const [showPicker, setShowPicker] = useState(false);
  const [targetWeightText, setTargetWeightText] = useState(
    targetWeight ? String(targetWeight) : "",
  );

  const dateValue = useMemo(() => {
    if (!targetDate) return new Date();
    const parsed = new Date(targetDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [targetDate]);

  const nextDisabled =
    !targetWeight || !targetDate || weeklyWeightChangeKg === null;

  return (
    <OnboardingShell
      step={6}
      totalSteps={8}
      title="Targets"
      subtitle="Set a realistic goal and pace you can sustain."
      onBack={() => {
        dispatch(prevStep());
        router.back();
      }}
      onNext={() => {
        dispatch(nextStep());
        router.push("/(onboarding)/step-7" as Href);
      }}
      nextDisabled={nextDisabled}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="gap-6">
          {/* ── Target Weight ─────────────────────────────────────────── */}
          <View className="gap-2">
            <Text
              style={{ color: colors.textMuted }}
              className="font-dmsans text-xs uppercase tracking-widest"
            >
              Target Weight ({weightUnit.toUpperCase()})
            </Text>
            <Input
              value={targetWeightText}
              onChangeText={(value) => {
                const sanitized = value.replace(/[^0-9.]/g, "");
                setTargetWeightText(sanitized);
                const parsed = sanitized ? parseFloat(sanitized) : null;
                dispatch(
                  updateOnboardingData({
                    targetWeight:
                      parsed !== null && !isNaN(parsed) ? parsed : null,
                  }),
                );
              }}
              keyboardType="decimal-pad"
              placeholder="Enter target weight"
            />
          </View>

          {/* ── Target Date ───────────────────────────────────────────── */}
          <View className="gap-2">
            <Text
              style={{ color: colors.textMuted }}
              className="font-dmsans text-xs uppercase tracking-widest"
            >
              Target Date
            </Text>
            <Button
              onPress={() => setShowPicker(true)}
              variant="outline"
              className="mt-0 w-full"
            >
              <Text
                style={{ color: colors.text }}
                className="font-dmsans text-base"
              >
                {targetDate
                  ? new Date(targetDate).toDateString()
                  : "Select target date"}
              </Text>
            </Button>
            <CustomDatePicker
              value={dateValue}
              minimumDate={new Date()}
              onChange={(selectedDate: Date) => {
                dispatch(
                  updateOnboardingData({
                    targetDate: selectedDate.toISOString(),
                  }),
                );
              }}
              visible={showPicker}
              onClose={() => setShowPicker(false)}
            />
          </View>

          <View className="gap-2">
            <Text
              style={{ color: colors.textMuted }}
              className="font-dmsans text-xs uppercase tracking-widest"
            >
              Weekly Weight Change
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {weeklyOptions.map((option) => {
                const active = weeklyWeightChangeKg === option.value;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() =>
                      dispatch(
                        updateOnboardingData({
                          weeklyWeightChangeKg: option.value,
                        }),
                      )
                    }
                    className="rounded-full border-2 px-4 py-3"
                    style={{
                      borderColor: active ? colors.border : colors.borderMuted,
                      backgroundColor: active ? colors.text : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: active ? colors.background : colors.text,
                      }}
                      className="font-dmsans-bold text-[13px]"
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </OnboardingShell>
  );
};

export default StepSixScreen;
