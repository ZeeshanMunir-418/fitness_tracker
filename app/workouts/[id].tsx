import { useTheme } from "@/lib/theme/ThemeContext";
import { useThemeStyles } from "@/lib/theme/useThemeStyles";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type {
    PlanType,
    WorkoutExercise,
} from "@/store/slices/workoutPlanSlice";
import { fetchActivePlans } from "@/store/slices/workoutPlanSlice";
import { workouts } from "@/utils/workouts";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Clock, Dumbbell, Moon } from "lucide-react-native";
import React, { useEffect, useMemo } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const fallbackImage = (dayNumber: number) => {
  const fallback = workouts[(dayNumber - 1) % workouts.length];
  return fallback?.image ?? workouts[0].image;
};

const exerciseSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "-");

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useThemeStyles();
  const { id, planType } = useLocalSearchParams<{
    id: string;
    planType?: string;
  }>();

  const { homePlan, gymPlan, loading } = useAppSelector((s) => s.workoutPlan);

  useEffect(() => {
    if (!homePlan && !gymPlan) {
      void dispatch(fetchActivePlans());
    }
  }, [dispatch, homePlan, gymPlan]);

  const allDays = useMemo(() => {
    const homeDays = (homePlan?.workout_plan_days ?? []).map((item) => ({
      ...item,
      sourcePlanType: "home" as PlanType,
    }));
    const gymDays = (gymPlan?.workout_plan_days ?? []).map((item) => ({
      ...item,
      sourcePlanType: "gym" as PlanType,
    }));
    return [...homeDays, ...gymDays];
  }, [homePlan, gymPlan]);

  const day = allDays.find((item) => item.id === id);
  const resolvedPlanType =
    (planType as PlanType) ?? day?.sourcePlanType ?? "home";

  const exercises: WorkoutExercise[] = Array.isArray(day?.exercises)
    ? day.exercises
    : [];

  const totalSets = exercises.reduce((sum, item) => sum + item.sets, 0);

  if (loading && !day) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  if (!day) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center px-6">
          <Text style={styles.text} className="font-dmsans-bold text-lg">
            Workout not found
          </Text>
          <Pressable onPress={() => router.back()} className="mt-3">
            <Text style={styles.textMuted} className="font-dmsans text-sm">
              Go back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (day.is_rest_day) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: 16 }}>
          <Pressable onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} strokeWidth={1.5} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Moon size={40} color={colors.textMuted} strokeWidth={1.5} />
          <Text
            style={[styles.text, { marginTop: 10 }]}
            className="font-dmsans-bold text-lg"
          >
            Rest Day
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 6 }]}
            className="font-dmsans text-sm"
          >
            Recovery day for {day.day_name}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="relative">
            <Image
              source={fallbackImage(day.day_number)}
              className="w-full h-56"
              resizeMode="contain"
            />
            <Pressable
              onPress={() => router.back()}
              className="absolute top-4 left-4 p-2 rounded-full"
              style={{ backgroundColor: colors.card }}
            >
              <ArrowLeft size={20} color={colors.text} strokeWidth={1.5} />
            </Pressable>
          </View>

          <View className="px-4 pt-5">
            <Text
              style={styles.textMuted}
              className="font-dmsans text-xs uppercase tracking-widest"
            >
              {day.day_name}
            </Text>
            <Text
              style={[styles.text, { marginTop: 4 }]}
              className="font-dmsans-bold text-2xl"
            >
              {day.title}
            </Text>
            {day.description ? (
              <Text
                style={[styles.textMuted, { marginTop: 6 }]}
                className="font-dmsans text-sm"
              >
                {day.description}
              </Text>
            ) : null}

            <View className="flex-row gap-2 mt-4">
              <View
                style={[
                  styles.card,
                  { borderWidth: 2, borderRadius: 12, padding: 12, flex: 1 },
                ]}
              >
                <Dumbbell size={16} color={colors.text} strokeWidth={1.5} />
                <Text
                  style={[styles.text, { marginTop: 6 }]}
                  className="font-dmsans-bold text-base"
                >
                  {day.exercises_count}
                </Text>
                <Text style={styles.textMuted} className="font-dmsans text-xs">
                  Exercises
                </Text>
              </View>
              <View
                style={[
                  styles.card,
                  { borderWidth: 2, borderRadius: 12, padding: 12, flex: 1 },
                ]}
              >
                <Clock size={16} color={colors.text} strokeWidth={1.5} />
                <Text
                  style={[styles.text, { marginTop: 6 }]}
                  className="font-dmsans-bold text-base"
                >
                  {day.duration_minutes}
                </Text>
                <Text style={styles.textMuted} className="font-dmsans text-xs">
                  Minutes
                </Text>
              </View>
              <View
                style={[
                  styles.card,
                  { borderWidth: 2, borderRadius: 12, padding: 12, flex: 1 },
                ]}
              >
                <Text
                  style={styles.text}
                  className="font-dmsans-bold text-base"
                >
                  {totalSets}
                </Text>
                <Text
                  style={styles.textMuted}
                  className="font-dmsans text-xs mt-1"
                >
                  Total sets
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.divider,
                { borderTopWidth: 2, marginVertical: 24 },
              ]}
            />

            {exercises.length === 0 ? (
              <View className="items-center py-8">
                <Text style={styles.textMuted} className="font-dmsans text-sm">
                  No exercises in this workout.
                </Text>
              </View>
            ) : (
              exercises.map((exercise, index) => (
                <View
                  key={`${exercise.name}-${index}`}
                  style={[
                    styles.card,
                    {
                      borderWidth: 2,
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 10,
                    },
                  ]}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-2">
                      <Text
                        style={styles.text}
                        className="font-dmsans-bold text-base"
                      >
                        {exercise.name}
                      </Text>
                      <Text
                        style={[styles.textMuted, { marginTop: 4 }]}
                        className="font-dmsans text-xs"
                      >
                        {exercise.muscleGroup}
                      </Text>
                    </View>
                    <View
                      style={{
                        borderWidth: 2,
                        borderRadius: 999,
                        borderColor: colors.borderMuted,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={styles.text}
                        className="font-dmsans-bold text-xs"
                      >
                        {exercise.sets} sets
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row gap-2 mt-3">
                    <View
                      style={[
                        styles.input,
                        {
                          borderWidth: 2,
                          borderRadius: 10,
                          padding: 8,
                          flex: 1,
                        },
                      ]}
                    >
                      <Text
                        style={styles.textMuted}
                        className="font-dmsans text-xs"
                      >
                        Reps
                      </Text>
                      <Text
                        style={styles.text}
                        className="font-dmsans-bold text-sm mt-1"
                      >
                        {exercise.reps}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.input,
                        {
                          borderWidth: 2,
                          borderRadius: 10,
                          padding: 8,
                          flex: 1,
                        },
                      ]}
                    >
                      <Text
                        style={styles.textMuted}
                        className="font-dmsans text-xs"
                      >
                        Rest
                      </Text>
                      <Text
                        style={styles.text}
                        className="font-dmsans-bold text-sm mt-1"
                      >
                        {exercise.restSeconds}s
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.input,
                        {
                          borderWidth: 2,
                          borderRadius: 10,
                          padding: 8,
                          flex: 1,
                        },
                      ]}
                    >
                      <Text
                        style={styles.textMuted}
                        className="font-dmsans text-xs"
                      >
                        Sets
                      </Text>
                      <Text
                        style={styles.text}
                        className="font-dmsans-bold text-sm mt-1"
                      >
                        {exercise.sets}
                      </Text>
                    </View>
                  </View>

                  {exercise.instructions ? (
                    <Text
                      style={[styles.textMuted, { marginTop: 8 }]}
                      className="font-dmsans text-xs leading-5"
                    >
                      {exercise.instructions}
                    </Text>
                  ) : null}

                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/workouts/exercises/[slug]",
                        params: {
                          id,
                          slug: exerciseSlug(exercise.name),
                          exercise: JSON.stringify(exercise),
                          planType: resolvedPlanType,
                        },
                      })
                    }
                    className="mt-3 py-3 rounded-xl items-center"
                    style={{ backgroundColor: colors.text }}
                  >
                    <Text
                      style={{ color: colors.background }}
                      className="font-dmsans-bold text-sm"
                    >
                      Start Exercise
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
