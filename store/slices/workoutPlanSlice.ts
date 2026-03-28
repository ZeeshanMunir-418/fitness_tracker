import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  muscleGroup: string;
  instructions: string;
}

export type PlanType = "home" | "gym";

export interface WorkoutPlanDay {
  id: string;
  workout_plan_id: string;
  day_name: string;
  day_number: number;
  title: string;
  description: string | null;
  image?: string | null;
  duration_minutes: number;
  exercises_count: number;
  is_rest_day: boolean;
  exercises: WorkoutExercise[];
  created_at: string;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  plan_type: PlanType;
  is_active: boolean;
  generated_at: string;
  created_at: string;
  workout_plan_days?: WorkoutPlanDay[];
}

export interface WorkoutPlanState {
  homePlan: WorkoutPlan | null;
  gymPlan: WorkoutPlan | null;
  days: WorkoutPlanDay[];
  loading: boolean;
  error: string | null;
}

const initialState: WorkoutPlanState = {
  homePlan: null,
  gymPlan: null,
  days: [],
  loading: false,
  error: null,
};

type ThunkConfig = { state: RootState; rejectValue: string };

const getTodayDayNumber = () => {
  const today = new Date().getDay();
  return today === 0 ? 7 : today;
};

/**
 * Fetches active home and gym workout plans with nested plan days for the current user.
 */
export const fetchActivePlans = createAsyncThunk<
  {
    homePlan: WorkoutPlan | null;
    gymPlan: WorkoutPlan | null;
    days: WorkoutPlanDay[];
  },
  void,
  ThunkConfig
>("workoutPlan/fetchActivePlans", async (_, { getState, rejectWithValue }) => {
  console.log("[workoutPlan] fetchActivePlans start");

  try {
    const userId = getState().auth.user?.id;

    if (!userId) {
      throw new Error("User is not authenticated.");
    }

    const { data, error } = await supabase
      .from("workout_plans")
      .select("*, workout_plan_days(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("generated_at", { ascending: false });

    if (error) {
      console.error("[workoutPlan] fetchActivePlans failed", error);
      return rejectWithValue(error.message);
    }

    const plans = (data ?? []) as WorkoutPlan[];
    const homePlan = plans.find((plan) => plan.plan_type === "home") ?? null;
    const gymPlan = plans.find((plan) => plan.plan_type === "gym") ?? null;

    const homeDays = homePlan?.workout_plan_days ?? [];
    const gymDays = gymPlan?.workout_plan_days ?? [];
    const days = [...homeDays, ...gymDays].sort(
      (left, right) => left.day_number - right.day_number,
    );

    console.log("[workoutPlan] fetchActivePlans end", {
      homePlan: Boolean(homePlan),
      gymPlan: Boolean(gymPlan),
      daysCount: days.length,
    });

    return { homePlan, gymPlan, days };
  } catch (error) {
    console.error("[workoutPlan] fetchActivePlans failed", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch active workout plans.";
    return rejectWithValue(message);
  }
});

/**
 * Fetches only today's workout plan days from active home and gym plans for the current user.
 */
export const fetchTodayWorkout = createAsyncThunk<
  {
    homePlan: WorkoutPlan | null;
    gymPlan: WorkoutPlan | null;
    days: WorkoutPlanDay[];
  },
  void,
  ThunkConfig
>("workoutPlan/fetchTodayWorkout", async (_, { getState, rejectWithValue }) => {
  console.log("[workoutPlan] fetchTodayWorkout start");

  try {
    const userId = getState().auth.user?.id;

    if (!userId) {
      throw new Error("User is not authenticated.");
    }

    const dayNumber = getTodayDayNumber();

    const { data, error } = await supabase
      .from("workout_plans")
      .select("*, workout_plan_days(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("generated_at", { ascending: false });

    if (error) {
      console.error("[workoutPlan] fetchTodayWorkout failed", error);
      return rejectWithValue(error.message);
    }

    const plans = (data ?? []) as WorkoutPlan[];
    const homePlan = plans.find((plan) => plan.plan_type === "home") ?? null;
    const gymPlan = plans.find((plan) => plan.plan_type === "gym") ?? null;

    const homeTodayDays = (homePlan?.workout_plan_days ?? []).filter(
      (day) => day.day_number === dayNumber,
    );
    const gymTodayDays = (gymPlan?.workout_plan_days ?? []).filter(
      (day) => day.day_number === dayNumber,
    );

    const days = [...homeTodayDays, ...gymTodayDays].sort(
      (left, right) => left.day_number - right.day_number,
    );

    console.log("[workoutPlan] fetchTodayWorkout end", {
      dayNumber,
      daysCount: days.length,
    });

    return { homePlan, gymPlan, days };
  } catch (error) {
    console.error("[workoutPlan] fetchTodayWorkout failed", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch today's workout.";
    return rejectWithValue(message);
  }
});

const workoutPlanSlice = createSlice({
  name: "workoutPlan",
  initialState,
  reducers: {
    resetWorkoutPlanState: (state) => {
      state.homePlan = null;
      state.gymPlan = null;
      state.days = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchActivePlans.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchActivePlans.fulfilled, (state, action) => {
      state.loading = false;
      state.homePlan = action.payload.homePlan;
      state.gymPlan = action.payload.gymPlan;
      state.days = action.payload.days;
    });
    builder.addCase(fetchActivePlans.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ??
        action.error.message ??
        "Failed to fetch active workout plans.";
    });

    builder.addCase(fetchTodayWorkout.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTodayWorkout.fulfilled, (state, action) => {
      state.loading = false;
      state.homePlan = action.payload.homePlan;
      state.gymPlan = action.payload.gymPlan;
      state.days = action.payload.days;
    });
    builder.addCase(fetchTodayWorkout.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ??
        action.error.message ??
        "Failed to fetch today's workout.";
    });
  },
});

export const { resetWorkoutPlanState } = workoutPlanSlice.actions;
export default workoutPlanSlice.reducer;
