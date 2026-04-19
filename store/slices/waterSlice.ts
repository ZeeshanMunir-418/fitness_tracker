import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface WaterLog {
  id: string;
  user_id: string;
  log_date: string;
  amount_ml: number;
  logged_at: string;
}

export interface DailyWaterSummary {
  user_id: string;
  log_date: string;
  total_ml: number;
  entries: number;
}

export interface WaterState {
  todayLogs: WaterLog[];
  totalMlToday: number;
  goalMl: number;
  summaries: DailyWaterSummary[];
  loading: boolean;
  error: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const getTodayIsoDate = () => new Date().toISOString().split("T")[0];

const sumMl = (logs: WaterLog[]) =>
  logs.reduce((total, log) => total + Number(log.amount_ml ?? 0), 0);

type ThunkConfig = { state: RootState; rejectValue: string };

// ── Thunks ─────────────────────────────────────────────────────────────────────

/**
 * Fetches all water logs for today for the current user.
 */
export const fetchTodayWaterLogs = createAsyncThunk<
  WaterLog[],
  void,
  ThunkConfig
>("water/fetchTodayWaterLogs", async (_, { getState, rejectWithValue }) => {
  try {
    const userId = getState().auth.user?.id;
    if (!userId) throw new Error("User is not authenticated.");

    const { data, error } = await supabase
      .from("water_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("log_date", getTodayIsoDate())
      .order("logged_at", { ascending: true });

    if (error) {
      console.error("[water] fetchTodayWaterLogs failed", error);
      return rejectWithValue(error.message);
    }

    return (data ?? []) as WaterLog[];
  } catch (error) {
    console.error("[water] fetchTodayWaterLogs failed", error);
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch water logs.",
    );
  }
});

/**
 * Adds a new water log entry for the current user.
 */
export const addWaterLog = createAsyncThunk<WaterLog, number, ThunkConfig>(
  "water/addWaterLog",
  async (amountMl, { getState, rejectWithValue }) => {
    try {
      const userId = getState().auth.user?.id;
      if (!userId) throw new Error("User is not authenticated.");

      const { data, error } = await supabase
        .from("water_logs")
        .insert({
          user_id: userId,
          log_date: getTodayIsoDate(),
          amount_ml: amountMl,
        })
        .select("*")
        .single();

      if (error) {
        console.error("[water] addWaterLog failed", error);
        return rejectWithValue(error.message);
      }

      return data as WaterLog;
    } catch (error) {
      console.error("[water] addWaterLog failed", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to add water log.",
      );
    }
  },
);

/**
 * Deletes a water log entry by id for the current user.
 */
export const deleteWaterLog = createAsyncThunk<string, string, ThunkConfig>(
  "water/deleteWaterLog",
  async (id, { getState, rejectWithValue }) => {
    try {
      const userId = getState().auth.user?.id;
      if (!userId) throw new Error("User is not authenticated.");

      const { error } = await supabase
        .from("water_logs")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("[water] deleteWaterLog failed", error);
        return rejectWithValue(error.message);
      }

      return id;
    } catch (error) {
      console.error("[water] deleteWaterLog failed", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete water log.",
      );
    }
  },
);

/**
 * Fetches daily_water_summary rows for the current user.
 * Pass a limit (default 30) to control how many past days to load.
 */
export const fetchWaterSummaries = createAsyncThunk<
  DailyWaterSummary[],
  { limit?: number } | void,
  ThunkConfig
>("water/fetchWaterSummaries", async (args, { getState, rejectWithValue }) => {
  try {
    const userId = getState().auth.user?.id;
    if (!userId) throw new Error("User is not authenticated.");

    const limit = args?.limit ?? 30;

    const { data, error } = await supabase
      .from("daily_water_summary")
      .select("*")
      .eq("user_id", userId)
      .order("log_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[water] fetchWaterSummaries failed", error);
      return rejectWithValue(error.message);
    }

    return (data ?? []) as DailyWaterSummary[];
  } catch (error) {
    console.error("[water] fetchWaterSummaries failed", error);
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to fetch water summaries.",
    );
  }
});

/**
 * Upserts today's summary row in daily_water_summary.
 * Called internally after addWaterLog / deleteWaterLog resolve,
 * but can also be called manually to force a sync.
 */
export const upsertWaterSummary = createAsyncThunk<
  DailyWaterSummary,
  void,
  ThunkConfig
>("water/upsertWaterSummary", async (_, { getState, rejectWithValue }) => {
  try {
    const userId = getState().auth.user?.id;
    if (!userId) throw new Error("User is not authenticated.");

    const { todayLogs } = getState().water;
    const today = getTodayIsoDate();
    const totalMl = todayLogs.reduce(
      (sum, l) => sum + Number(l.amount_ml ?? 0),
      0,
    );

    const { data, error } = await supabase
      .from("daily_water_summary")
      .upsert(
        {
          user_id: userId,
          log_date: today,
          total_ml: totalMl,
          entries: todayLogs.length,
        },
        { onConflict: "user_id,log_date" },
      )
      .select("*")
      .single();

    if (error) {
      console.error("[water] upsertWaterSummary failed", error);
      return rejectWithValue(error.message);
    }

    return data as DailyWaterSummary;
  } catch (error) {
    console.error("[water] upsertWaterSummary failed", error);
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to upsert water summary.",
    );
  }
});

// ── Slice ──────────────────────────────────────────────────────────────────────
const initialState: WaterState = {
  todayLogs: [],
  totalMlToday: 0,
  goalMl: 2000,
  summaries: [],
  loading: false,
  error: null,
};

const waterSlice = createSlice({
  name: "water",
  initialState,
  reducers: {
    /**
     * Syncs the goal from the profile (called by useWater when profile loads).
     */
    setWaterGoal(state, action: PayloadAction<number>) {
      state.goalMl = action.payload;
    },
    resetWaterState(state) {
      state.todayLogs = [];
      state.totalMlToday = 0;
      state.summaries = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchTodayWaterLogs
    builder.addCase(fetchTodayWaterLogs.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTodayWaterLogs.fulfilled, (state, action) => {
      state.loading = false;
      state.todayLogs = action.payload;
      state.totalMlToday = sumMl(action.payload);
    });
    builder.addCase(fetchTodayWaterLogs.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ?? action.error.message ?? "Failed to fetch water logs.";
    });

    // addWaterLog
    builder.addCase(addWaterLog.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addWaterLog.fulfilled, (state, action) => {
      state.loading = false;
      state.todayLogs.push(action.payload);
      state.totalMlToday = sumMl(state.todayLogs);
    });
    builder.addCase(addWaterLog.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ?? action.error.message ?? "Failed to add water log.";
    });

    // deleteWaterLog
    builder.addCase(deleteWaterLog.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteWaterLog.fulfilled, (state, action) => {
      state.loading = false;
      state.todayLogs = state.todayLogs.filter(
        (log) => log.id !== action.payload,
      );
      state.totalMlToday = sumMl(state.todayLogs);
    });
    builder.addCase(deleteWaterLog.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ?? action.error.message ?? "Failed to delete water log.";
    });

    // fetchWaterSummaries
    builder.addCase(fetchWaterSummaries.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchWaterSummaries.fulfilled, (state, action) => {
      state.loading = false;
      state.summaries = action.payload;
    });
    builder.addCase(fetchWaterSummaries.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ??
        action.error.message ??
        "Failed to fetch water summaries.";
    });

    // upsertWaterSummary — silent background sync, no loading flag
    builder.addCase(upsertWaterSummary.fulfilled, (state, action) => {
      const idx = state.summaries.findIndex(
        (s) => s.log_date === action.payload.log_date,
      );
      if (idx >= 0) {
        state.summaries[idx] = action.payload;
      } else {
        state.summaries.unshift(action.payload);
      }
    });
    builder.addCase(upsertWaterSummary.rejected, (_, action) => {
      console.warn("[water] upsertWaterSummary rejected", action.payload);
    });
  },
});

// ── Exports ────────────────────────────────────────────────────────────────────
export const { setWaterGoal, resetWaterState } = waterSlice.actions;
export const selectWaterState = (state: RootState) => state.water;
export const selectWaterSummaries = (state: RootState) => state.water.summaries;
export default waterSlice.reducer;
