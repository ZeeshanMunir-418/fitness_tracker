import { Workout } from "@/components/(tabs)/home/workout-card";
import { WorkoutPlanDay } from "@/store/slices/workoutPlanSlice";

export const workouts: Workout[] = [
  {
    id: 1,
    title: "Upper Body Strength Training",
    image: require("@/assets/images/upper-body-strength.png"),
    duration: "45 MIN",
    exercisesCount: 6,
    day: "Sunday, 15 March",
  },
  {
    id: 2,
    title: "Core & Abs Blast",
    image: require("@/assets/images/core-abs.png"),
    duration: "30 MIN",
    exercisesCount: 8,
    day: "Monday, 16 March",
  },
  {
    id: 3,
    title: "Lower Body Strength Training",
    image: require("@/assets/images/lower-body-strength.png"),
    duration: "45 MIN",
    exercisesCount: 6,
    day: "Tuesday, 17 March",
  },
  {
    id: 4,
    title: "Full Body HIIT Workout",
    image: require("@/assets/images/full-body-hiit.png"),
    duration: "30 MIN",
    exercisesCount: 10,
    day: "Wednesday, 18 March",
  },
  {
    id: 5,
    title: "Yoga for Flexibility",
    image: require("@/assets/images/yoga-flexibility.png"),
    duration: "60 MIN",
    exercisesCount: 12,
    day: "Thursday, 19 March",
  },
];

export const getTodayDayNumber = () => {
  const today = new Date().getDay();
  return today === 0 ? 7 : today;
};

export const toDurationLabel = (
  row: WorkoutPlanDay,
  fallback: string,
): string => {
  if (typeof row.duration_minutes === "number") {
    return `${row.duration_minutes} MIN`;
  }
  return fallback;
};

export const toExercisesCount = (
  row: WorkoutPlanDay,
  fallback: number,
): number => {
  if (typeof row.exercises_count === "number") {
    return row.exercises_count;
  }
  if (Array.isArray(row.exercises)) {
    return row.exercises.length;
  }
  return fallback;
};

export const pickWorkoutForDay = (
  days: WorkoutPlanDay[] | undefined,
  dayNumber: number,
): WorkoutPlanDay | null => {
  if (!days?.length) return null;
  return days.find((d) => d.day_number === dayNumber) ?? null;
};
