import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useThemeStyles } from "@/lib/theme/useThemeStyles";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    fetchProfile,
    updateProfile,
    type ActivityLevelType,
    type GoalType,
    type WorkoutDurationType,
    type WorkoutType,
} from "@/store/slices/profileSlice";
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

const GOAL_OPTIONS: { label: string; value: GoalType }[] = [
  { label: "Lose Weight", value: "lose_weight" },
  { label: "Build Muscle", value: "build_muscle" },
  { label: "Improve Endurance", value: "improve_endurance" },
  { label: "Improve Flexibility", value: "improve_flexibility" },
  { label: "Maintain Weight", value: "maintain_weight" },
];

const ACTIVITY_OPTIONS: { label: string; value: ActivityLevelType }[] = [
  { label: "Sedentary", value: "sedentary" },
  { label: "Lightly Active", value: "lightly_active" },
  { label: "Moderately Active", value: "moderately_active" },
  { label: "Very Active", value: "very_active" },
  { label: "Athlete", value: "athlete" },
];

const WORKOUT_TYPE_OPTIONS: { label: string; value: WorkoutType }[] = [
  { label: "Strength Training", value: "strength_training" },
  { label: "Cardio", value: "cardio" },
  { label: "HIIT", value: "hiit" },
  { label: "Yoga/Flexibility", value: "yoga_flexibility" },
  { label: "Mixed", value: "mixed" },
];

const DURATION_OPTIONS: { label: string; value: WorkoutDurationType }[] = [
  { label: "15-30 min", value: "15_30" },
  { label: "30-45 min", value: "30_45" },
  { label: "45-60 min", value: "45_60" },
  { label: "60+ min", value: "60_plus" },
];

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export default function FitnessGoalsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useThemeStyles();
  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
  } = useAppSelector((s) => s.profile);

  const [primaryGoal, setPrimaryGoal] = useState<GoalType>("maintain_weight");
  const [activityLevel, setActivityLevel] =
    useState<ActivityLevelType>("moderately_active");
  const [preferredWorkoutType, setPreferredWorkoutType] =
    useState<WorkoutType>("mixed");
  const [workoutDuration, setWorkoutDuration] =
    useState<WorkoutDurationType>("30_45");
  const [workoutDaysPerWeek, setWorkoutDaysPerWeek] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile && !profileLoading) {
      void dispatch(fetchProfile());
    }
  }, [dispatch, profile, profileLoading]);

  useEffect(() => {
    setPrimaryGoal(profile?.primary_goal ?? "maintain_weight");
    setActivityLevel(profile?.activity_level ?? "moderately_active");
    setPreferredWorkoutType(profile?.preferred_workout_type ?? "mixed");
    setWorkoutDuration(profile?.workout_duration ?? "30_45");
    setWorkoutDaysPerWeek(profile?.workout_days_per_week ?? 3);
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await dispatch(
        updateProfile({
          primary_goal: primaryGoal,
          activity_level: activityLevel,
          preferred_workout_type: preferredWorkoutType,
          workout_duration: workoutDuration,
          workout_days_per_week: workoutDaysPerWeek,
        }),
      ).unwrap();
      console.log("[fitnessGoals] save success");
      router.back();
    } catch (saveError) {
      console.error("[fitnessGoals] save failed", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save fitness goals.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading && !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.text} />
          <Text
            style={[styles.textMuted, { marginTop: 12 }]}
            className="font-dmsans"
          >
            Loading goals...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile && profileError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center px-6">
          <Text style={styles.text} className="font-dmsans-bold text-lg">
            No profile data
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 8, textAlign: "center" }]}
            className="font-dmsans"
          >
            {profileError}
          </Text>
          <Button
            variant="outline"
            className="mt-4"
            onPress={() => void dispatch(fetchProfile())}
          >
            <Text style={styles.text} className="font-dmsans-bold text-sm">
              Retry
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const renderPills = <T extends string>(
    options: { label: string; value: T }[],
    selected: T,
    onSelect: (value: T) => void,
  ) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
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
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 16,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text
          style={[styles.text, { fontSize: 22 }]}
          className="font-dmsans-bold"
        >
          Fitness Goals
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Primary Goal
          </Text>
          {renderPills(GOAL_OPTIONS, primaryGoal, setPrimaryGoal)}
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Activity Level
          </Text>
          {renderPills(ACTIVITY_OPTIONS, activityLevel, setActivityLevel)}
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Preferred Workout Type
          </Text>
          {renderPills(
            WORKOUT_TYPE_OPTIONS,
            preferredWorkoutType,
            setPreferredWorkoutType,
          )}
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Workout Duration
          </Text>
          {renderPills(DURATION_OPTIONS, workoutDuration, setWorkoutDuration)}
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Workout Days Per Week
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {DAY_OPTIONS.map((day) => {
              const active = workoutDaysPerWeek === day;
              return (
                <Pressable
                  key={day}
                  onPress={() => setWorkoutDaysPerWeek(day)}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    borderWidth: 2,
                    alignItems: "center",
                    justifyContent: "center",
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
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button onPress={handleSave} disabled={saving} className="w-full mt-6">
          <Text
            style={{ color: colors.background }}
            className="font-dmsans-bold text-base"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </Button>

        {error ? (
          <Text
            style={[styles.textMuted, { fontSize: 13, marginTop: 8 }]}
            className="font-dmsans"
          >
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
