import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export interface FoodItem {
  id: string;
  daily_meal_id: string;
  food_id: string | null; // nullable in schema
  food_name: string;
  serving_size: string;
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  created_at: string;
}

export interface DailyMeal {
  id: string;
  user_id: string;
  meal_date: string;
  meal_type: MealType;
  total_calories: number;
  created_at: string;
  updated_at: string;
  food_items?: FoodItem[];
}

export interface UpsertDailyMealInput {
  meal_type: MealType;
  total_calories: number;
}

export interface DailyMealState {
  meals: DailyMeal[];
  todayCalories: number;
  loading: boolean;
  error: string | null;
}

const initialState: DailyMealState = {
  meals: [],
  todayCalories: 0,
  loading: false,
  error: null,
};

type ThunkConfig = { state: RootState; rejectValue: string };

const getTodayIsoDate = () => new Date().toISOString().split("T")[0];

const calculateCalories = (meals: DailyMeal[]) =>
  meals.reduce((total, meal) => total + Number(meal.total_calories ?? 0), 0);

export const fetchTodayMeals = createAsyncThunk<
  { meals: DailyMeal[]; todayCalories: number },
  void,
  ThunkConfig
>("dailyMeal/fetchTodayMeals", async (_, { getState, rejectWithValue }) => {
  const userId = getState().auth.user?.id;
  if (!userId) return rejectWithValue("User is not authenticated.");

  const { data, error } = await supabase
    .from("daily_meals")
    .select("*, food_items(*)")
    .eq("user_id", userId)
    .eq("meal_date", getTodayIsoDate())
    .order("meal_type", { ascending: true });

  if (error) {
    console.error("[dailyMeal] fetchTodayMeals failed", error);
    return rejectWithValue(error.message);
  }

  const meals = (data ?? []) as DailyMeal[];
  return { meals, todayCalories: calculateCalories(meals) };
});

export const fetchMealsForDate = createAsyncThunk<
  { meals: DailyMeal[]; todayCalories: number },
  string, // YYYY-MM-DD
  ThunkConfig
>(
  "dailyMeal/fetchMealsForDate",
  async (date, { getState, rejectWithValue }) => {
    const userId = getState().auth.user?.id;
    if (!userId) return rejectWithValue("User is not authenticated.");

    const { data, error } = await supabase
      .from("daily_meals")
      .select("*, food_items(*)")
      .eq("user_id", userId)
      .eq("meal_date", date)
      .order("meal_type", { ascending: true });

    if (error) {
      console.error("[dailyMeal] fetchMealsForDate failed", error);
      return rejectWithValue(error.message);
    }

    const meals = (data ?? []) as DailyMeal[];
    return { meals, todayCalories: calculateCalories(meals) };
  },
);

export const upsertDailyMeal = createAsyncThunk<
  DailyMeal,
  UpsertDailyMealInput,
  ThunkConfig
>(
  "dailyMeal/upsertDailyMeal",
  async (payload, { getState, rejectWithValue }) => {
    const userId = getState().auth.user?.id;
    if (!userId) return rejectWithValue("User is not authenticated.");

    const { data, error } = await supabase
      .from("daily_meals")
      .upsert(
        {
          user_id: userId,
          meal_date: getTodayIsoDate(),
          meal_type: payload.meal_type,
          total_calories: payload.total_calories,
        },
        { onConflict: "user_id,meal_date,meal_type" },
      )
      .select("*, food_items(*)")
      .single();

    if (error) {
      console.error("[dailyMeal] upsertDailyMeal failed", error);
      return rejectWithValue(error.message);
    }

    return data as DailyMeal;
  },
);

export const deleteDailyMeal = createAsyncThunk<string, string, ThunkConfig>(
  "dailyMeal/deleteDailyMeal",
  async (id, { getState, rejectWithValue }) => {
    const userId = getState().auth.user?.id;
    if (!userId) return rejectWithValue("User is not authenticated.");

    const { error } = await supabase
      .from("daily_meals")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("[dailyMeal] deleteDailyMeal failed", error);
      return rejectWithValue(error.message);
    }

    return id;
  },
);

const dailyMealSlice = createSlice({
  name: "dailyMeal",
  initialState,
  reducers: {
    resetDailyMealState: () => initialState,
  },
  extraReducers: (builder) => {
    // fetchTodayMeals
    builder.addCase(fetchTodayMeals.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTodayMeals.fulfilled, (state, action) => {
      state.loading = false;
      state.meals = action.payload.meals;
      state.todayCalories = action.payload.todayCalories;
    });
    builder.addCase(fetchTodayMeals.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ??
        action.error.message ??
        "Failed to fetch today's meals.";
    });

    // fetchMealsForDate
    builder.addCase(fetchMealsForDate.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchMealsForDate.fulfilled, (state, action) => {
      state.loading = false;
      state.meals = action.payload.meals;
      state.todayCalories = action.payload.todayCalories;
    });
    builder.addCase(fetchMealsForDate.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ??
        action.error.message ??
        "Failed to fetch meals for date.";
    });

    // upsertDailyMeal
    builder.addCase(upsertDailyMeal.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(upsertDailyMeal.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.meals.findIndex((m) => m.id === action.payload.id);
      if (index >= 0) {
        state.meals[index] = action.payload;
      } else {
        state.meals.push(action.payload);
      }
      state.todayCalories = calculateCalories(state.meals);
    });
    builder.addCase(upsertDailyMeal.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ??
        action.error.message ??
        "Failed to upsert daily meal.";
    });

    // deleteDailyMeal
    builder.addCase(deleteDailyMeal.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteDailyMeal.fulfilled, (state, action) => {
      state.loading = false;
      state.meals = state.meals.filter((m) => m.id !== action.payload);
      state.todayCalories = calculateCalories(state.meals);
    });
    builder.addCase(deleteDailyMeal.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ??
        action.error.message ??
        "Failed to delete daily meal.";
    });
  },
});

export const { resetDailyMealState } = dailyMealSlice.actions;
export default dailyMealSlice.reducer;
