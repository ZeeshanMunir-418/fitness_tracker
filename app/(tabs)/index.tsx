import { CalorieRing } from "@/components/(tabs)/home/calories-ring";
import {
  MetricCard,
  type KeyMetrics,
} from "@/components/(tabs)/home/metric-card";
import WorkoutCard from "@/components/(tabs)/home/workout-card";
import { Button } from "@/components/ui/button";
import { useGreeting } from "@/lib/hooks/useGreeting";
import { usePedometer } from "@/lib/hooks/usePedometer";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchTodayMeals } from "@/store/slices/dailyMealSlice";
import { fetchProfile } from "@/store/slices/profileSlice";
import { fetchRecentWorkoutLogs } from "@/store/slices/workoutLogSlice";
import type { WorkoutPlanDay } from "@/store/slices/workoutPlanSlice";
import { fetchActivePlans } from "@/store/slices/workoutPlanSlice";
import {
  getTodayDayNumber,
  pickWorkoutForDay,
  toDurationLabel,
  toExercisesCount,
  workouts,
} from "@/utils/workouts";
import { Link } from "expo-router";
import {
  ArrowRight,
  Droplets,
  Flame,
  Footprints,
  SlidersVertical,
  Timer,
} from "lucide-react-native";
import React, { useEffect, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatSteps = (steps: number): string => {
  if (steps >= 1000) return `${(steps / 1000).toFixed(1)}k`;
  return String(steps);
};

const HomeScreen = () => {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const [workoutType, setWorkoutType] = React.useState<"home" | "gym" | null>(
    null,
  );

  const { greeting, day } = useGreeting();
  const { data: profile } = useAppSelector((s) => s.profile);
  const { gymPlan, homePlan } = useAppSelector((s) => s.workoutPlan);
  const { todayCalories, meals } = useAppSelector((s) => s.dailyMeal);
  const { logs } = useAppSelector((s) => s.workoutLog);

  const { steps, available: pedometerAvailable } = usePedometer();

  const fallbackWorkout =
    workouts.find((w) => w.day?.startsWith(day)) ?? workouts[0];
  const todayNumber = getTodayDayNumber();

  // ── Fetch on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchActivePlans());
    dispatch(fetchTodayMeals());
    dispatch(fetchRecentWorkoutLogs(7));
    if (!profile) dispatch(fetchProfile());
  }, [dispatch]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const calorieGoal = profile?.daily_calorie_target ?? 2000;
  const waterGoalLiters = profile?.daily_water_goal_liters ?? 2;

  const todayActiveMinutes = useMemo(() => {
    const todayIso = new Date().toISOString().split("T")[0];
    return logs
      .filter((log) => log.completed_at.startsWith(todayIso))
      .reduce((sum, log) => sum + log.duration_minutes, 0);
  }, [logs]);

  const macroCalories = useMemo(() => {
    if (meals.length === 0) return todayCalories;
    return meals.reduce(
      (sum, meal) => sum + Number(meal.total_calories ?? 0),
      0,
    );
  }, [meals, todayCalories]);

  const stepsDisplay = pedometerAvailable ? formatSteps(steps) : "--";

  // ── Metric cards ───────────────────────────────────────────────────────────
  // Flame  → calories burned/consumed today (most relevant to fitness goal)
  // Droplets → water intake goal (hydration tracking)
  // Footprints → step count (movement tracking)
  // Timer  → active workout minutes today
  const keyMetrics: KeyMetrics[] = [
    {
      icon: Flame,
      value: macroCalories > 0 ? macroCalories.toLocaleString() : "0",
      label: "KCAL",
    },
    {
      icon: Droplets,
      value: `${waterGoalLiters}L`,
      label: "WATER",
    },
    {
      icon: Footprints,
      value: stepsDisplay,
      label: "STEPS",
    },
    {
      icon: Timer,
      value: todayActiveMinutes > 0 ? `${todayActiveMinutes}` : "0",
      label: "MINS",
    },
  ];

  // ── Workout type toggle ────────────────────────────────────────────────────
  useEffect(() => {
    setWorkoutType((current) => {
      if (current === "home" && homePlan) return current;
      if (current === "gym" && gymPlan) return current;
      if (homePlan) return "home";
      if (gymPlan) return "gym";
      return null;
    });
  }, [homePlan, gymPlan]);

  const handleToggleWorkoutType = () => {
    if (homePlan && gymPlan) {
      setWorkoutType((current) => (current === "home" ? "gym" : "home"));
      return;
    }
    if (homePlan) {
      setWorkoutType("home");
      return;
    }
    if (gymPlan) {
      setWorkoutType("gym");
      return;
    }
    setWorkoutType(null);
  };

  // ── Today's workout ────────────────────────────────────────────────────────
  const todayWorkout: WorkoutPlanDay | typeof fallbackWorkout | null = (() => {
    if (workoutType === "home") {
      return (
        pickWorkoutForDay(homePlan?.workout_plan_days, todayNumber) ??
        fallbackWorkout
      );
    }
    if (workoutType === "gym") {
      return (
        pickWorkoutForDay(gymPlan?.workout_plan_days, todayNumber) ??
        fallbackWorkout
      );
    }
    return (
      pickWorkoutForDay(homePlan?.workout_plan_days, todayNumber) ??
      pickWorkoutForDay(gymPlan?.workout_plan_days, todayNumber) ??
      homePlan?.workout_plan_days?.[0] ??
      gymPlan?.workout_plan_days?.[0] ??
      fallbackWorkout
    );
  })();

  const isRestDay =
    todayWorkout &&
    "is_rest_day" in todayWorkout &&
    todayWorkout.is_rest_day === true;

  const workoutCardData =
    todayWorkout && !isRestDay
      ? {
          id: fallbackWorkout.id,
          title:
            ("title" in todayWorkout ? todayWorkout.title : null) ??
            fallbackWorkout.title,
          image: fallbackWorkout.image,
          duration: toDurationLabel(
            todayWorkout as WorkoutPlanDay,
            fallbackWorkout.duration,
          ),
          exercisesCount: toExercisesCount(
            todayWorkout as WorkoutPlanDay,
            fallbackWorkout.exercisesCount,
          ),
        }
      : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text
            style={{ color: colors.textMuted }}
            className="text-base font-dmsans"
          >
            {greeting}
          </Text>
          <Text
            style={{ color: colors.text }}
            className="text-2xl font-dmsans-bold"
          >
            {profile?.full_name || "User"}
          </Text>
        </View>
        <Button
          variant="ghost"
          size="icon"
          onPress={handleToggleWorkoutType}
          className="mt-0"
        >
          <SlidersVertical size={24} color={colors.text} strokeWidth={1.5} />
        </Button>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Calorie ring */}
        <View
          style={{
            paddingHorizontal: 16,
            marginTop: 32,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CalorieRing goal={calorieGoal} intake={macroCalories} size={255} />
        </View>

        {/* Metric cards — 2x2 grid */}
        <View
          style={{
            paddingHorizontal: 16,
            marginTop: 24,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {keyMetrics.map((metric, index) => (
            <View key={index} style={{ width: "47%" }}>
              <MetricCard
                icon={metric.icon}
                value={metric.value}
                label={metric.label}
              />
            </View>
          ))}
        </View>

        {/* Divider */}
        <View
          style={{
            marginHorizontal: "auto",
            marginVertical: 32,
            width: 128,
            height: 2,
            borderRadius: 999,
            backgroundColor: colors.border,
          }}
        />

        {/* Today's workout header */}
        <View
          style={{
            paddingHorizontal: 16,
            marginBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{ color: colors.text }}
              className="text-2xl font-dmsans-bold leading-none"
            >
              Today's Workout
            </Text>
            <Text
              style={{ color: colors.textMuted, marginTop: 2 }}
              className="text-sm font-dmsans"
            >
              {day}
            </Text>
          </View>
          <Link href="/workouts" asChild>
            <Button variant="ghost" size="icon" className="mt-0">
              <ArrowRight size={24} color={colors.text} strokeWidth={1.5} />
            </Button>
          </Link>
        </View>

        {/* Workout card */}
        <View style={{ paddingHorizontal: 16 }}>
          {isRestDay ? (
            <View
              style={{
                width: "100%",
                height: 160,
                borderWidth: 2,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                borderColor: colors.borderMuted,
                backgroundColor: colors.card,
              }}
            >
              <Text
                style={{ color: colors.textMuted }}
                className="font-dmsans text-lg"
              >
                Rest Day
              </Text>
              <Text
                style={{ color: colors.textFaint, marginTop: 4 }}
                className="font-dmsans text-sm"
              >
                Recovery is part of the plan.
              </Text>
            </View>
          ) : workoutCardData ? (
            <WorkoutCard
              id={workoutCardData.id}
              title={workoutCardData.title}
              image={workoutCardData.image}
              duration={workoutCardData.duration}
              exercisesCount={workoutCardData.exercisesCount}
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: 160,
                borderWidth: 2,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                borderColor: colors.borderMuted,
                backgroundColor: colors.card,
              }}
            >
              <Text
                style={{ color: colors.textMuted }}
                className="font-dmsans text-sm"
              >
                No workout scheduled for today.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
