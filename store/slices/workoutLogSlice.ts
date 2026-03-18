import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export type PlanType = "home" | "gym";

export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_plan_day_id: string | null;
  title: string;
  duration_minutes: number;
  exercises_count: number;
  plan_type: PlanType;
  completed_at: string;
  notes: string | null;
  created_at: string;
}

export interface LogWorkoutInput {
  workout_plan_day_id?: string;
  title: string;
  duration_minutes: number;
  exercises_count: number;
  plan_type: PlanType;
  notes?: string;
}

export interface WorkoutLogState {
  logs: WorkoutLog[];
  loading: boolean;
  error: string | null;
}

const initialState: WorkoutLogState = {
  logs: [],
  loading: false,
  error: null,
};

type ThunkConfig = { state: RootState; rejectValue: string };

/**
 * Fetches all workout logs for the current user ordered by completion date descending.
 */
export const fetchWorkoutLogs = createAsyncThunk<
  WorkoutLog[],
  void,
  ThunkConfig
>("workoutLog/fetchWorkoutLogs", async (_, { getState, rejectWithValue }) => {
  console.log("[workoutLog] fetchWorkoutLogs start");

  try {
    const userId = getState().auth.user?.id;

    if (!userId) {
      throw new Error("User is not authenticated.");
    }

    const { data, error } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("[workoutLog] fetchWorkoutLogs failed", error);
      return rejectWithValue(error.message);
    }

    const logs = (data ?? []) as WorkoutLog[];
    console.log("[workoutLog] fetchWorkoutLogs end", {
      logsCount: logs.length,
    });
    return logs;
  } catch (error) {
    console.error("[workoutLog] fetchWorkoutLogs failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch workout logs.";
    return rejectWithValue(message);
  }
});

/**
 * Fetches the most recent N workout logs for the current user.
 */
export const fetchRecentWorkoutLogs = createAsyncThunk<
  WorkoutLog[],
  number,
  ThunkConfig
>(
  "workoutLog/fetchRecentWorkoutLogs",
  async (limit, { getState, rejectWithValue }) => {
    console.log("[workoutLog] fetchRecentWorkoutLogs start", { limit });

    try {
      const userId = getState().auth.user?.id;

      if (!userId) {
        throw new Error("User is not authenticated.");
      }

      const { data, error } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[workoutLog] fetchRecentWorkoutLogs failed", error);
        return rejectWithValue(error.message);
      }

      const logs = (data ?? []) as WorkoutLog[];
      console.log("[workoutLog] fetchRecentWorkoutLogs end", {
        logsCount: logs.length,
      });
      return logs;
    } catch (error) {
      console.error("[workoutLog] fetchRecentWorkoutLogs failed", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch recent workout logs.";
      return rejectWithValue(message);
    }
  },
);

/**
 * Persists a completed workout log for the current user.
 */
export const logWorkout = createAsyncThunk<
  WorkoutLog,
  LogWorkoutInput,
  ThunkConfig
>("workoutLog/logWorkout", async (payload, { getState, rejectWithValue }) => {
  console.log("[workoutLog] logWorkout start", {
    title: payload.title,
    planType: payload.plan_type,
  });

  try {
    const userId = getState().auth.user?.id;

    if (!userId) {
      throw new Error("User is not authenticated.");
    }

    const { data, error } = await supabase
      .from("workout_logs")
      .insert({
        user_id: userId,
        workout_plan_day_id: payload.workout_plan_day_id ?? null,
        title: payload.title,
        duration_minutes: payload.duration_minutes,
        exercises_count: payload.exercises_count,
        plan_type: payload.plan_type,
        notes: payload.notes ?? null,
        completed_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("[workoutLog] logWorkout failed", error);
      return rejectWithValue(error.message);
    }

    const log = data as WorkoutLog;
    console.log("[workoutLog] logWorkout end", { id: log.id });
    return log;
  } catch (error) {
    console.error("[workoutLog] logWorkout failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to log workout.";
    return rejectWithValue(message);
  }
});

/**
 * Deletes a workout log by id for the current user.
 */
export const deleteWorkoutLog = createAsyncThunk<string, string, ThunkConfig>(
  "workoutLog/deleteWorkoutLog",
  async (id, { getState, rejectWithValue }) => {
    console.log("[workoutLog] deleteWorkoutLog start", { id });

    try {
      const userId = getState().auth.user?.id;

      if (!userId) {
        throw new Error("User is not authenticated.");
      }

      const { error } = await supabase
        .from("workout_logs")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("[workoutLog] deleteWorkoutLog failed", error);
        return rejectWithValue(error.message);
      }

      console.log("[workoutLog] deleteWorkoutLog end", { id });
      return id;
    } catch (error) {
      console.error("[workoutLog] deleteWorkoutLog failed", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete workout log.";
      return rejectWithValue(message);
    }
  },
);

const workoutLogSlice = createSlice({
  name: "workoutLog",
  initialState,
  reducers: {
    resetWorkoutLogState: (state) => {
      state.logs = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchWorkoutLogs.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchWorkoutLogs.fulfilled, (state, action) => {
      state.loading = false;
      state.logs = action.payload;
    });
    builder.addCase(fetchWorkoutLogs.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ??
        action.error.message ??
        "Failed to fetch workout logs.";
    });

    builder.addCase(fetchRecentWorkoutLogs.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRecentWorkoutLogs.fulfilled, (state, action) => {
      state.loading = false;
      state.logs = action.payload;
    });
    builder.addCase(fetchRecentWorkoutLogs.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ??
        action.error.message ??
        "Failed to fetch recent workout logs.";
    });

    builder.addCase(logWorkout.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(logWorkout.fulfilled, (state, action) => {
      state.loading = false;
      state.logs = [action.payload, ...state.logs];
    });
    builder.addCase(logWorkout.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ?? action.error.message ?? "Failed to log workout.";
    });

    builder.addCase(deleteWorkoutLog.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteWorkoutLog.fulfilled, (state, action) => {
      state.loading = false;
      state.logs = state.logs.filter((log) => log.id !== action.payload);
    });
    builder.addCase(deleteWorkoutLog.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ??
        action.error.message ??
        "Failed to delete workout log.";
    });
  },
});

export const { resetWorkoutLogState } = workoutLogSlice.actions;
export default workoutLogSlice.reducer;
