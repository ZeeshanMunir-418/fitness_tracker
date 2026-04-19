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

  const totalSets = exercises.reduce((sum, e) => sum + (e.sets ?? 0), 0);

  // Hero GIF: use first exercise's gifUrl
  const heroGifUrl: string | null = exercises[0]?.gifUrl ?? null;

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
        <Stack.Screen options={{ headerShown: false }} />
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
        <Stack.Screen options={{ headerShown: false }} />
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
            Rest & Recovery
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 6 }]}
            className="font-dmsans text-sm text-center"
          >
            {day.day_name} is your recovery day. Light stretching or a walk is
            encouraged.
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
          {/* Hero — real GIF or placeholder */}
          <View style={{ position: "relative" }}>
            {heroGifUrl ? (
              <Image
                source={fallbackImage(day.day_number)}
                style={{ width: "100%", height: 220 }}
                resizeMode="contain"
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: 220,
                  backgroundColor: colors.borderMuted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Dumbbell
                  size={40}
                  color={colors.textMuted}
                  strokeWidth={1.5}
                />
              </View>
            )}
            <Pressable
              onPress={() => router.back()}
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                padding: 8,
                borderRadius: 999,
                backgroundColor: colors.card,
              }}
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

            {/* Stats row */}
            <View className="flex-row gap-2 mt-4">
              {[
                {
                  icon: (
                    <Dumbbell size={16} color={colors.text} strokeWidth={1.5} />
                  ),
                  value: day.exercises_count,
                  label: "Exercises",
                },
                {
                  icon: (
                    <Clock size={16} color={colors.text} strokeWidth={1.5} />
                  ),
                  value: day.duration_minutes,
                  label: "Minutes",
                },
                { icon: null, value: totalSets, label: "Total sets" },
              ].map(({ icon, value, label }) => (
                <View
                  key={label}
                  style={[
                    styles.card,
                    { borderWidth: 2, borderRadius: 12, padding: 12, flex: 1 },
                  ]}
                >
                  {icon}
                  <Text
                    style={[styles.text, { marginTop: icon ? 6 : 0 }]}
                    className="font-dmsans-bold text-base"
                  >
                    {value}
                  </Text>
                  <Text
                    style={styles.textMuted}
                    className="font-dmsans text-xs"
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.divider,
                { borderTopWidth: 2, marginVertical: 24 },
              ]}
            />

            {/* Exercise list */}
            {exercises.length === 0 ? (
              <View className="items-center py-8">
                <Text style={styles.textMuted} className="font-dmsans text-sm">
                  No exercises in this workout.
                </Text>
              </View>
            ) : (
              exercises.map((exercise, index) => (
                <View
                  key={exercise.exerciseDbId ?? `${exercise.name}-${index}`}
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
                  {/* Exercise GIF thumbnail */}
                  <View className="flex flex-row items-center justify-center">
                    {exercise.gifUrl ? (
                      <Image
                        source={{ uri: exercise.gifUrl }}
                        style={{
                          width: 200,
                          height: 200,
                        }}
                        resizeMode="cover"
                      />
                    ) : null}
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-2">
                      <Text
                        style={styles.text}
                        className="font-dmsans-bold text-base capitalize"
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
                    {[
                      { label: "Reps", value: exercise.reps },
                      { label: "Rest", value: `${exercise.restSeconds}s` },
                      { label: "Sets", value: exercise.sets },
                    ].map(({ label, value }) => (
                      <View
                        key={label}
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
                          {label}
                        </Text>
                        <Text
                          style={styles.text}
                          className="font-dmsans-bold text-sm mt-1"
                        >
                          {value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {exercise.instructions
                    ? exercise.instructions
                        .split(". ")
                        .map((instruction, index) => (
                          <Text
                            key={index}
                            style={styles.textMuted}
                            className="font-dmsans text-xs leading-5 mb-px"
                            numberOfLines={4}
                          >
                            {instruction}
                          </Text>
                        ))
                    : null}

                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/workouts/exercises/[slug]",
                        params: {
                          id,
                          slug:
                            exercise.exerciseDbId ??
                            exercise.name.toLowerCase().replace(/\s+/g, "-"),
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
