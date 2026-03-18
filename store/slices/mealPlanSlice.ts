import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export interface MealPlanFoodItem {
  id: string;
  meal_plan_meal_id: string;
  food_name: string;
  serving_size: string;
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  created_at: string;
}

export interface MealPlanMeal {
  id: string;
  meal_plan_day_id: string;
  meal_type: MealType;
  total_calories: number;
  created_at: string;
  meal_plan_food_items?: MealPlanFoodItem[];
}

export interface MealPlanDay {
  id: string;
  meal_plan_id: string;
  day_name: string;
  day_number: number;
  total_calories: number;
  created_at: string;
  meal_plan_meals?: MealPlanMeal[];
}

export interface MealPlan {
  id: string;
  user_id: string;
  is_active: boolean;
  generated_at: string;
  created_at: string;
  meal_plan_days?: MealPlanDay[];
}

export interface MealPlanState {
  plan: MealPlan | null;
  days: MealPlanDay[];
  meals: MealPlanMeal[];
  foodItems: MealPlanFoodItem[];
  loading: boolean;
  error: string | null;
}

const initialState: MealPlanState = {
  plan: null,
  days: [],
  meals: [],
  foodItems: [],
  loading: false,
  error: null,
};

type ThunkConfig = { state: RootState; rejectValue: string };

const flattenMeals = (days: MealPlanDay[]) =>
  days.flatMap((day) => day.meal_plan_meals ?? []);

const flattenFoodItems = (meals: MealPlanMeal[]) =>
  meals.flatMap((meal) => meal.meal_plan_food_items ?? []);

/**
 * Fetches the active meal plan and all nested days, meals, and food items for the current user.
 */
export const fetchActiveMealPlan = createAsyncThunk<
  {
    plan: MealPlan | null;
    days: MealPlanDay[];
    meals: MealPlanMeal[];
    foodItems: MealPlanFoodItem[];
  },
  void,
  ThunkConfig
>("mealPlan/fetchActiveMealPlan", async (_, { getState, rejectWithValue }) => {
  console.log("[mealPlan] fetchActiveMealPlan start");

  try {
    const userId = getState().auth.user?.id;

    if (!userId) {
      throw new Error("User is not authenticated.");
    }

    const { data, error } = await supabase
      .from("meal_plans")
      .select(
        "*, meal_plan_days(*, meal_plan_meals(*, meal_plan_food_items(*)))",
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[mealPlan] fetchActiveMealPlan failed", error);
      return rejectWithValue(error.message);
    }

    const plan = (data ?? null) as MealPlan | null;

    if (!plan) {
      console.log("[mealPlan] fetchActiveMealPlan end", {
        planFound: false,
      });
      return { plan: null, days: [], meals: [], foodItems: [] };
    }

    const days = (plan.meal_plan_days ?? []).sort(
      (left, right) => left.day_number - right.day_number,
    );
    const meals = flattenMeals(days);
    const foodItems = flattenFoodItems(meals);

    console.log("[mealPlan] fetchActiveMealPlan end", {
      planFound: true,
      daysCount: days.length,
      mealsCount: meals.length,
      foodItemsCount: foodItems.length,
    });

    return { plan, days, meals, foodItems };
  } catch (error) {
    console.error("[mealPlan] fetchActiveMealPlan failed", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch active meal plan.";
    return rejectWithValue(message);
  }
});

/**
 * Fetches meal plan entries for a specific day number (1-7) from the user's active meal plan.
 */
export const fetchMealPlanForDay = createAsyncThunk<
  { days: MealPlanDay[]; meals: MealPlanMeal[]; foodItems: MealPlanFoodItem[] },
  number,
  ThunkConfig
>(
  "mealPlan/fetchMealPlanForDay",
  async (dayNumber, { getState, rejectWithValue }) => {
    console.log("[mealPlan] fetchMealPlanForDay start", { dayNumber });

    try {
      const userId = getState().auth.user?.id;

      if (!userId) {
        throw new Error("User is not authenticated.");
      }

      const { data: planData, error: planError } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planError) {
        console.error(
          "[mealPlan] fetchMealPlanForDay failed while fetching plan",
          planError,
        );
        return rejectWithValue(planError.message);
      }

      if (!planData) {
        console.log("[mealPlan] fetchMealPlanForDay end", {
          dayNumber,
          planFound: false,
        });
        return { days: [], meals: [], foodItems: [] };
      }

      const { data, error } = await supabase
        .from("meal_plan_days")
        .select("*, meal_plan_meals(*, meal_plan_food_items(*))")
        .eq("meal_plan_id", planData.id)
        .eq("day_number", dayNumber)
        .order("day_number", { ascending: true });

      if (error) {
        console.error("[mealPlan] fetchMealPlanForDay failed", error);
        return rejectWithValue(error.message);
      }

      const days = ((data ?? []) as MealPlanDay[]).sort(
        (left, right) => left.day_number - right.day_number,
      );
      const meals = flattenMeals(days);
      const foodItems = flattenFoodItems(meals);

      console.log("[mealPlan] fetchMealPlanForDay end", {
        dayNumber,
        daysCount: days.length,
        mealsCount: meals.length,
        foodItemsCount: foodItems.length,
      });

      return { days, meals, foodItems };
    } catch (error) {
      console.error("[mealPlan] fetchMealPlanForDay failed", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch meal plan for day.";
      return rejectWithValue(message);
    }
  },
);

const mealPlanSlice = createSlice({
  name: "mealPlan",
  initialState,
  reducers: {
    resetMealPlanState: (state) => {
      state.plan = null;
      state.days = [];
      state.meals = [];
      state.foodItems = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchActiveMealPlan.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchActiveMealPlan.fulfilled, (state, action) => {
      state.loading = false;
      state.plan = action.payload.plan;
      state.days = action.payload.days;
      state.meals = action.payload.meals;
      state.foodItems = action.payload.foodItems;
    });
    builder.addCase(fetchActiveMealPlan.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ??
        action.error.message ??
        "Failed to fetch active meal plan.";
    });

    builder.addCase(fetchMealPlanForDay.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchMealPlanForDay.fulfilled, (state, action) => {
      state.loading = false;
      state.days = action.payload.days;
      state.meals = action.payload.meals;
      state.foodItems = action.payload.foodItems;
    });
    builder.addCase(fetchMealPlanForDay.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ??
        action.error.message ??
        "Failed to fetch meal plan for day.";
    });
  },
});

export const { resetMealPlanState } = mealPlanSlice.actions;
export default mealPlanSlice.reducer;
