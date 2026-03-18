import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProfile, updateProfile } from "@/store/slices/profileSlice";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TIME_OPTIONS: {
  label: string;
  value: "morning" | "afternoon" | "evening";
}[] = [
  { label: "Morning", value: "morning" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();

  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
  } = useAppSelector((s) => s.profile);

  const [workoutReminders, setWorkoutReminders] = useState(false);
  const [mealReminders, setMealReminders] = useState(false);
  const [preferredWorkoutTime, setPreferredWorkoutTime] = useState<
    "morning" | "afternoon" | "evening"
  >("morning");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile && !profileLoading) {
      void dispatch(fetchProfile());
    }
  }, [dispatch, profile, profileLoading]);

  useEffect(() => {
    if (!profile) return;
    setWorkoutReminders(Boolean(profile.workout_reminders));
    setMealReminders(Boolean(profile.meal_reminders));
    setPreferredWorkoutTime(profile.preferred_workout_time ?? "morning");
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await dispatch(
        updateProfile({
          workout_reminders: workoutReminders,
          meal_reminders: mealReminders,
          preferred_workout_time: preferredWorkoutTime,
        }),
      ).unwrap();
      console.log("[notificationSettings] save success");
      router.back();
    } catch (saveError) {
      console.error("[notificationSettings] save failed", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save notification settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (profileLoading && !profile) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        className="items-center justify-center"
      >
        <ActivityIndicator size="large" color={colors.text} />
        <Text
          style={{ color: colors.textMuted, marginTop: 12 }}
          className="font-dmsans text-sm"
        >
          Loading settings...
        </Text>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (!profile && profileError) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        className="flex-1 items-center justify-center px-6"
      >
        <Text
          style={{ color: colors.text }}
          className="font-dmsans-bold text-lg"
        >
          Unable to load settings
        </Text>
        <Text
          style={{ color: colors.textMuted, marginTop: 8, textAlign: "center" }}
          className="font-dmsans text-sm"
        >
          {profileError}
        </Text>
        <Button
          onPress={() => void dispatch(fetchProfile())}
          variant="outline"
          className="mt-4"
        >
          <Text
            style={{ color: colors.text }}
            className="font-dmsans-bold text-sm"
          >
            Retry
          </Text>
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pt-4 pb-2">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text
          style={{ color: colors.text }}
          className="font-dmsans-bold text-2xl"
        >
          Notification Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        className="px-4 pt-4"
      >
        {/* Workout Reminders */}
        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            borderWidth: 2,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text
                style={{ color: colors.text }}
                className="font-dmsans-bold text-sm"
              >
                Workout Reminders
              </Text>
              <Text
                style={{ color: colors.textMuted, marginTop: 4 }}
                className="font-dmsans text-xs leading-5"
              >
                Sends reminders to help you stay consistent with your planned
                sessions.
              </Text>
            </View>
            <Toggle
              value={workoutReminders}
              onValueChange={setWorkoutReminders}
            />
          </View>
        </View>

        {/* Meal Reminders */}
        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            borderWidth: 2,
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text
                style={{ color: colors.text }}
                className="font-dmsans-bold text-sm"
              >
                Meal Reminders
              </Text>
              <Text
                style={{ color: colors.textMuted, marginTop: 4 }}
                className="font-dmsans text-xs leading-5"
              >
                Sends prompts for meal timing and nutrition logging throughout
                the day.
              </Text>
            </View>
            <Toggle value={mealReminders} onValueChange={setMealReminders} />
          </View>
        </View>

        {/* Preferred Workout Time */}
        <View className="mb-8">
          <Text
            style={{ color: colors.textMuted, marginBottom: 12 }}
            className="font-dmsans text-xs uppercase tracking-widest"
          >
            Preferred Workout Time
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {TIME_OPTIONS.map((opt) => {
              const active = preferredWorkoutTime === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setPreferredWorkoutTime(opt.value)}
                  style={{
                    paddingHorizontal: 20,
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
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text
            style={{ color: colors.textFaint, marginTop: 8 }}
            className="font-dmsans text-xs"
          >
            Reminders will be sent around your selected time window.
          </Text>
        </View>

        {/* Divider */}
        <View
          style={{
            borderTopWidth: 2,
            borderColor: colors.cardBorder,
            marginBottom: 24,
          }}
        />

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saving ? colors.textFaint : colors.text,
            borderRadius: 999,
            paddingVertical: 18,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Text
            style={{ color: colors.background }}
            className="font-dmsans-bold text-base"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </Pressable>

        {/* Error */}
        {error ? (
          <Text
            style={{ color: "#ef4444", marginTop: 8 }}
            className="font-dmsans text-sm text-center"
          >
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
