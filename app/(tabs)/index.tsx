import { CalorieRing } from "@/components/(tabs)/home/calories-ring";
import {
  MetricCard,
  type KeyMetrics,
} from "@/components/(tabs)/home/metric-card";
import WorkoutCard from "@/components/(tabs)/home/workout-card";
import { Button } from "@/components/ui/button";
import { useGreeting } from "@/lib/hooks/useGreeting";
import { supabase } from "@/lib/supabase";
import { useAppSelector } from "@/store/hooks";
import { workouts } from "@/utils/workouts";
import { Link } from "expo-router";
import {
  ArrowRight,
  Droplets,
  Footprints,
  SlidersVertical,
  Zap,
} from "lucide-react-native";
import React, { useCallback, useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type WorkoutPlan = {
  id: string;
  plan_type: "home" | "gym" | string;
  is_active: boolean;
  user_id: string;
};

type WorkoutPlanDay = {
  id: string;
  title?: string | null;
  workout_name?: string | null;
  name?: string | null;
  duration?: string | number | null;
  duration_minutes?: number | null;
  exercises_count?: number | null;
  exercises?: unknown;
  workout_plans: WorkoutPlan;
};

const toDurationLabel = (row: WorkoutPlanDay, fallbackDuration: string) => {
  if (typeof row.duration === "string" && row.duration.trim()) {
    return row.duration;
  }

  if (typeof row.duration === "number") {
    return `${row.duration} MIN`;
  }

  if (typeof row.duration_minutes === "number") {
    return `${row.duration_minutes} MIN`;
  }

  return fallbackDuration;
};

const toExercisesCount = (row: WorkoutPlanDay, fallbackCount: number) => {
  if (typeof row.exercises_count === "number") {
    return row.exercises_count;
  }

  if (Array.isArray(row.exercises)) {
    return row.exercises.length;
  }

  return fallbackCount;
};

const HomeScreen = () => {
  const [gymWorkout, setGymWorkout] = React.useState<WorkoutPlanDay | null>(
    null,
  );
  const [homeWorkout, setHomeWorkout] = React.useState<WorkoutPlanDay | null>(
    null,
  );
  const [workoutType, setWorkoutType] = React.useState<"home" | "gym" | null>(
    null,
  );
  const { greeting, day } = useGreeting();
  const { data } = useAppSelector((s) => s.profile);
  const { user } = useAppSelector((s) => s.auth);
  const fallbackWorkout =
    workouts.find((w) => w.day?.startsWith(day)) ?? workouts[0];

  const keyMetrics: KeyMetrics[] = [
    { icon: Footprints, value: "8,432", label: "STEPS" },
    { icon: Droplets, value: "1.2L", label: "WATER" },
    { icon: Zap, value: "45", label: "MINS" },
  ];

  const fetchWorkout = useCallback(async () => {
    if (!user?.id) return;

    try {
      const today = new Date();
      const dayNumber = today.getDay() === 0 ? 7 : today.getDay();

      const { data, error } = await supabase
        .from("workout_plan_days")
        .select(
          `
        *,
        workout_plans!inner (
          id,
          plan_type,
          is_active,
          user_id
        )
      `,
        )
        .eq("workout_plans.user_id", user?.id)
        .eq("workout_plans.is_active", true)
        .eq("day_number", dayNumber)
        .order("created_at", {
          referencedTable: "workout_plans",
          ascending: false,
        });

      if (error) throw error;

      console.log("[workout] today's workouts fetched", data);
      const workoutRows = (data ?? []) as WorkoutPlanDay[];

      const homeWorkout = workoutRows.find(
        (d) => d.workout_plans.plan_type === "home",
      );
      const gymWorkout = workoutRows.find(
        (d) => d.workout_plans.plan_type === "gym",
      );

      setHomeWorkout(homeWorkout ?? null);
      setGymWorkout(gymWorkout ?? null);
    } catch (error) {
      console.log("[workout] fetch failed", error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWorkout();
  }, [fetchWorkout]);

  useEffect(() => {
    setWorkoutType((current) => {
      if (current === "home" && homeWorkout) return current;
      if (current === "gym" && gymWorkout) return current;
      if (homeWorkout) return "home";
      if (gymWorkout) return "gym";
      return null;
    });
  }, [homeWorkout, gymWorkout]);

  const handleToggleWorkoutType = () => {
    if (homeWorkout && gymWorkout) {
      setWorkoutType((current) => (current === "home" ? "gym" : "home"));
      return;
    }

    if (homeWorkout) {
      setWorkoutType("home");
      return;
    }

    if (gymWorkout) {
      setWorkoutType("gym");
      return;
    }

    setWorkoutType(null);
  };

  const workout =
    workoutType === "home"
      ? homeWorkout
      : workoutType === "gym"
        ? gymWorkout
        : (homeWorkout ?? gymWorkout);

  const workoutCardData = workout
    ? {
        id: Number(workout.id) || fallbackWorkout.id,
        title:
          workout.title ??
          workout.workout_name ??
          workout.name ??
          fallbackWorkout.title,
        image: fallbackWorkout.image,
        duration: toDurationLabel(workout, fallbackWorkout.duration),
        exercisesCount: toExercisesCount(
          workout,
          fallbackWorkout.exercisesCount,
        ),
      }
    : null;

  return (
    <SafeAreaView className="flex-1">
      <View className="px-4 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-semibold font-dmsans">{greeting}</Text>
          <Text className="text-2xl font-dmsans-bold">
            {data?.full_name || "User"}
          </Text>
        </View>
        <Button
          variant="ghost"
          size="icon"
          onPress={handleToggleWorkoutType}
          className="mt-0"
        >
          <SlidersVertical size={24} color="black" strokeWidth={1.5} />
        </Button>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 mt-16 flex-row items-center justify-center ">
          <CalorieRing goal={2500} intake={1850} size={255} />
        </View>
        <View className="px-4 mt-16 flex-row items-center justify-center gap-4">
          {keyMetrics.map((metric, index) => (
            <MetricCard
              key={index}
              icon={metric.icon}
              value={metric.value}
              label={metric.label}
            />
          ))}
        </View>
        <View className="px-4 my-16 border-2 border-black max-w-32 w-full mx-auto rounded-xl" />

        <View className="px-4 mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-dmsans-bold leading-none">
              Today&apos;s Workout
            </Text>
            <Text className="text-sm text-gray-600 leading-none font-dmsans">
              {day}
            </Text>
          </View>
          <Link href="/workouts" asChild>
            <Button variant="ghost" size="icon" className="mt-0">
              <ArrowRight size={24} color="black" />
            </Button>
          </Link>
        </View>

        {/* Workout Cards */}
        <View className="px-4">
          {workoutCardData ? (
            <WorkoutCard
              id={workoutCardData.id}
              title={workoutCardData.title}
              image={workoutCardData.image}
              duration={workoutCardData.duration}
              exercisesCount={workoutCardData.exercisesCount}
            />
          ) : (
            <View className="w-full h-48 border-2 border-gray-300 rounded-xl items-center justify-center">
              <Text className="text-gray-500 font-dmsans">
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
