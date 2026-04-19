import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export interface WorkoutExercise {
  exerciseDbId: string; // ExerciseDB exercise ID
  name: string;
  gifUrl: string; // ExerciseDB GIF URL
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

// ── Fetch all active plans (home + gym) with all 7 days ────────────────────────

export const fetchActivePlans = createAsyncThunk<
  {
    homePlan: WorkoutPlan | null;
    gymPlan: WorkoutPlan | null;
    days: WorkoutPlanDay[];
  },
  void,
  ThunkConfig
>("workoutPlan/fetchActivePlans", async (_, { getState, rejectWithValue }) => {
  const userId = getState().auth.user?.id;
  if (!userId) return rejectWithValue("User is not authenticated.");

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
  const homePlan = plans.find((p) => p.plan_type === "home") ?? null;
  const gymPlan = plans.find((p) => p.plan_type === "gym") ?? null;

  const days = [
    ...(homePlan?.workout_plan_days ?? []),
    ...(gymPlan?.workout_plan_days ?? []),
  ].sort((a, b) => a.day_number - b.day_number);

  console.log("[workoutPlan] fetchActivePlans done", {
    homePlan: Boolean(homePlan),
    gymPlan: Boolean(gymPlan),
    days: days.length,
  });

  return { homePlan, gymPlan, days };
});

// ── Fetch today's workout only ─────────────────────────────────────────────────

export const fetchTodayWorkout = createAsyncThunk<
  {
    homePlan: WorkoutPlan | null;
    gymPlan: WorkoutPlan | null;
    days: WorkoutPlanDay[];
  },
  void,
  ThunkConfig
>("workoutPlan/fetchTodayWorkout", async (_, { getState, rejectWithValue }) => {
  const userId = getState().auth.user?.id;
  if (!userId) return rejectWithValue("User is not authenticated.");

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
  const homePlan = plans.find((p) => p.plan_type === "home") ?? null;
  const gymPlan = plans.find((p) => p.plan_type === "gym") ?? null;

  const days = [
    ...(homePlan?.workout_plan_days ?? []).filter(
      (d) => d.day_number === dayNumber,
    ),
    ...(gymPlan?.workout_plan_days ?? []).filter(
      (d) => d.day_number === dayNumber,
    ),
  ].sort((a, b) => a.day_number - b.day_number);

  console.log("[workoutPlan] fetchTodayWorkout done", {
    dayNumber,
    days: days.length,
  });

  return { homePlan, gymPlan, days };
});

// ── Slice ──────────────────────────────────────────────────────────────────────

const workoutPlanSlice = createSlice({
  name: "workoutPlan",
  initialState,
  reducers: {
    resetWorkoutPlanState: () => initialState,
  },
  extraReducers: (builder) => {
    // fetchActivePlans
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

    // fetchTodayWorkout
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
