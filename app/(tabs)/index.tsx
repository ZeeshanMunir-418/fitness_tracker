import { CalorieRing } from "@/components/(tabs)/home/calorie-ring";
import {
  MetricCard,
  type KeyMetrics,
} from "@/components/(tabs)/home/metric-card";
import { Progress } from "@/components/(tabs)/home/progress";
import WorkoutCard from "@/components/(tabs)/home/workout-card";
import { Button } from "@/components/ui/button";
import { useGreeting } from "@/lib/hooks/useGreeting";
import { usePedometer } from "@/lib/hooks/usePedometer";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchTodayMeals } from "@/store/slices/dailyMealSlice";
import { generateWorkoutPlan } from "@/store/slices/onboardingSlice";
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
import { Link, useRouter } from "expo-router";
import {
  ArrowRight,
  Droplets,
  Flame,
  Footprints,
  Plus,
  Timer,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatSteps = (steps: number): string => {
  if (steps >= 1000) return `${(steps / 1000).toFixed(1)}k`;
  return String(steps);
};

const HomeScreen = () => {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const router = useRouter();
  const hasTriggeredPlanRetryRef = useRef(false);
  const [workoutType, setWorkoutType] = React.useState<"home" | "gym" | null>(
    null,
  );
  const { greeting, day } = useGreeting();
  const { data: profile } = useAppSelector((s) => s.profile);
  const { gymPlan, homePlan } = useAppSelector((s) => s.workoutPlan);
  const { planGenerationLoading } = useAppSelector((s) => s.onboarding);
  const { todayCalories, meals } = useAppSelector((s) => s.dailyMeal);
  const { logs } = useAppSelector((s) => s.workoutLog);

  const { steps, available: pedometerAvailable } = usePedometer();

  const fallbackWorkout =
    workouts.find((w) => w.day?.startsWith(day)) ?? workouts[0];
  const todayNumber = getTodayDayNumber();

  useEffect(() => {
    dispatch(fetchActivePlans());
    dispatch(fetchTodayMeals());
    dispatch(fetchRecentWorkoutLogs(7));
    if (!profile) dispatch(fetchProfile());
  }, [dispatch]);

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

  const macros = useMemo(() => {
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    meals.forEach((meal) => {
      meal.food_items?.forEach((item) => {
        protein += Number(item.protein_grams ?? 0);
        carbs += Number(item.carbs_grams ?? 0);
        fat += Number(item.fat_grams ?? 0);
      });
    });
    return { protein, carbs, fat };
  }, [meals]);

  const macroGoals = useMemo(
    () => ({
      carbs: Math.round((calorieGoal * 0.5) / 4),
      protein: Math.round((calorieGoal * 0.25) / 4),
      fat: Math.round((calorieGoal * 0.25) / 9),
    }),
    [calorieGoal],
  );

  const nutritionStats = [
    {
      label: "Carbs",
      intake: Math.round(macros.carbs),
      goal: macroGoals.carbs,
    },
    {
      label: "Protein",
      intake: Math.round(macros.protein),
      goal: macroGoals.protein,
    },
    {
      label: "Fats",
      intake: Math.round(macros.fat),
      goal: macroGoals.fat,
    },
  ];

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

  useEffect(() => {
    setWorkoutType((current) => {
      if (current === "home" && homePlan) return current;
      if (current === "gym" && gymPlan) return current;
      if (homePlan) return "home";
      if (gymPlan) return "gym";
      return null;
    });
    console.log("HomePlan:", homePlan?.id);
    console.log("GymPlan:", gymPlan?.id);
  }, [homePlan, gymPlan]);

  useEffect(() => {
    if (hasTriggeredPlanRetryRef.current) {
      return;
    }

    if (planGenerationLoading) {
      return;
    }

    if (!profile?.onboarding_completed) {
      return;
    }

    if (homePlan || gymPlan) {
      return;
    }

    hasTriggeredPlanRetryRef.current = true;

    void dispatch(
      generateWorkoutPlan({
        id: profile.id,
        primary_goal: profile.primary_goal,
        activity_level: profile.activity_level,
        preferred_workout_type: profile.preferred_workout_type,
        workout_duration: profile.workout_duration,
        workout_days_per_week: profile.workout_days_per_week,
        age: profile.age,
        gender: profile.gender,
        current_weight: profile.current_weight,
        weight_unit: profile.weight_unit,
        height: profile.height,
        height_unit: profile.height_unit,
      }),
    ).finally(() => {
      // Refresh plans after retry attempt resolves.
      void dispatch(fetchActivePlans());
    });
  }, [
    dispatch,
    gymPlan,
    homePlan,
    planGenerationLoading,
    profile?.activity_level,
    profile?.age,
    profile?.current_weight,
    profile?.gender,
    profile?.height,
    profile?.height_unit,
    profile?.id,
    profile?.onboarding_completed,
    profile?.preferred_workout_type,
    profile?.primary_goal,
    profile?.weight_unit,
    profile?.workout_days_per_week,
    profile?.workout_duration,
  ]);

  const todayWorkout: WorkoutPlanDay | null = (() => {
    if (workoutType === "home") {
      return (
        pickWorkoutForDay(homePlan?.workout_plan_days, todayNumber) ?? null
      );
    }
    if (workoutType === "gym") {
      return pickWorkoutForDay(gymPlan?.workout_plan_days, todayNumber) ?? null;
    }
    return (
      pickWorkoutForDay(homePlan?.workout_plan_days, todayNumber) ??
      pickWorkoutForDay(gymPlan?.workout_plan_days, todayNumber) ??
      homePlan?.workout_plan_days?.[0] ??
      gymPlan?.workout_plan_days?.[0] ??
      null
    );
  })();

  const isRestDay =
    todayWorkout &&
    "is_rest_day" in todayWorkout &&
    todayWorkout.is_rest_day === true;

  const workoutCardData =
    todayWorkout && !isRestDay
      ? {
          id: todayWorkout.id,
          title:
            "title" in todayWorkout
              ? (todayWorkout.title ?? "Today's Workout")
              : "Today's Workout",
          image: fallbackWorkout.image,
          duration: toDurationLabel(todayWorkout as WorkoutPlanDay, ""),
          exercisesCount: toExercisesCount(todayWorkout as WorkoutPlanDay, 0),
        }
      : null;

  useEffect(() => {
    console.log("Today's workout:", workoutCardData);
  }, []);

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
          onPress={() => router.push("/scan")}
          className="mt-0"
        >
          <Plus color={colors.text} size={24} />
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

        <View className="px-6 my-6">
          {nutritionStats.map((stat, idx) => (
            <View className="mb-4" key={idx}>
              <Progress
                goal={stat.goal}
                intake={stat.intake}
                leftText={stat.label}
                rightText={stat.intake + " / " + stat.goal + "g"}
              />
            </View>
          ))}
        </View>

        {/* Metric cards — 2x2 grid */}
        <View className="px-6 flex-row flex-wrap gap-4">
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
          <Link href={"/workouts"} asChild>
            <Button variant="ghost" size="sm" className="mt-0 ">
              <View className="flex-row items-center gap-1">
                <Text className="font-dmsans">Show All</Text>
                <ArrowRight size={24} color={colors.text} strokeWidth={1.5} />
              </View>
            </Button>
          </Link>
        </View>

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
