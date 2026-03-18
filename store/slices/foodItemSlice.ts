import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export interface FoodItem {
  id: string;
  daily_meal_id: string;
  food_id: string;
  food_name: string;
  serving_size: string;
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  created_at: string;
}

export interface FoodItemState {
  items: FoodItem[];
  loading: boolean;
  error: string | null;
}

const initialState: FoodItemState = {
  items: [],
  loading: false,
  error: null,
};

type ThunkConfig = { state: RootState; rejectValue: string };

/**
 * Fetches all food items linked to a specific daily meal.
 */
export const fetchFoodItemsForMeal = createAsyncThunk<
  FoodItem[],
  string,
  ThunkConfig
>(
  "foodItem/fetchFoodItemsForMeal",
  async (dailyMealId, { getState, rejectWithValue }) => {
    console.log("[foodItem] fetchFoodItemsForMeal start", { dailyMealId });

    try {
      const userId = getState().auth.user?.id;

      if (!userId) {
        throw new Error("User is not authenticated.");
      }

      const { data: mealData, error: mealError } = await supabase
        .from("daily_meals")
        .select("id")
        .eq("id", dailyMealId)
        .eq("user_id", userId)
        .maybeSingle();

      if (mealError) {
        console.error(
          "[foodItem] fetchFoodItemsForMeal failed while validating meal",
          mealError,
        );
        return rejectWithValue(mealError.message);
      }

      if (!mealData) {
        console.log("[foodItem] fetchFoodItemsForMeal end", { itemsCount: 0 });
        return [];
      }

      const { data, error } = await supabase
        .from("food_items")
        .select("*")
        .eq("daily_meal_id", dailyMealId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[foodItem] fetchFoodItemsForMeal failed", error);
        return rejectWithValue(error.message);
      }

      const items = (data ?? []) as FoodItem[];
      console.log("[foodItem] fetchFoodItemsForMeal end", {
        itemsCount: items.length,
      });
      return items;
    } catch (error) {
      console.error("[foodItem] fetchFoodItemsForMeal failed", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch food items for meal.";
      return rejectWithValue(message);
    }
  },
);

/**
 * Adds a food item to a daily meal.
 */
export const addFoodItem = createAsyncThunk<
  FoodItem,
  Omit<FoodItem, "id" | "created_at">,
  ThunkConfig
>("foodItem/addFoodItem", async (payload, { getState, rejectWithValue }) => {
  console.log("[foodItem] addFoodItem start", {
    dailyMealId: payload.daily_meal_id,
  });

  try {
    const userId = getState().auth.user?.id;

    if (!userId) {
      throw new Error("User is not authenticated.");
    }

    const { data: mealData, error: mealError } = await supabase
      .from("daily_meals")
      .select("id")
      .eq("id", payload.daily_meal_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (mealError) {
      console.error(
        "[foodItem] addFoodItem failed while validating meal",
        mealError,
      );
      return rejectWithValue(mealError.message);
    }

    if (!mealData) {
      return rejectWithValue("Meal not found for current user.");
    }

    const { data, error } = await supabase
      .from("food_items")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[foodItem] addFoodItem failed", error);
      return rejectWithValue(error.message);
    }

    const item = data as FoodItem;
    console.log("[foodItem] addFoodItem end", { id: item.id });
    return item;
  } catch (error) {
    console.error("[foodItem] addFoodItem failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to add food item.";
    return rejectWithValue(message);
  }
});

/**
 * Deletes a food item by id.
 */
export const deleteFoodItem = createAsyncThunk<string, string, ThunkConfig>(
  "foodItem/deleteFoodItem",
  async (id, { getState, rejectWithValue }) => {
    console.log("[foodItem] deleteFoodItem start", { id });

    try {
      const userId = getState().auth.user?.id;

      if (!userId) {
        throw new Error("User is not authenticated.");
      }

      const { data: itemData, error: itemError } = await supabase
        .from("food_items")
        .select("id, daily_meal_id")
        .eq("id", id)
        .maybeSingle();

      if (itemError) {
        console.error(
          "[foodItem] deleteFoodItem failed while validating item",
          itemError,
        );
        return rejectWithValue(itemError.message);
      }

      if (!itemData) {
        return id;
      }

      const { data: mealData, error: mealError } = await supabase
        .from("daily_meals")
        .select("id")
        .eq("id", itemData.daily_meal_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (mealError) {
        console.error(
          "[foodItem] deleteFoodItem failed while validating meal",
          mealError,
        );
        return rejectWithValue(mealError.message);
      }

      if (!mealData) {
        return rejectWithValue("Food item does not belong to current user.");
      }

      const { error } = await supabase.from("food_items").delete().eq("id", id);

      if (error) {
        console.error("[foodItem] deleteFoodItem failed", error);
        return rejectWithValue(error.message);
      }

      console.log("[foodItem] deleteFoodItem end", { id });
      return id;
    } catch (error) {
      console.error("[foodItem] deleteFoodItem failed", error);
      const message =
        error instanceof Error ? error.message : "Failed to delete food item.";
      return rejectWithValue(message);
    }
  },
);

const foodItemSlice = createSlice({
  name: "foodItem",
  initialState,
  reducers: {
    resetFoodItemState: (state) => {
      state.items = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchFoodItemsForMeal.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchFoodItemsForMeal.fulfilled, (state, action) => {
      state.loading = false;
      state.items = action.payload;
    });
    builder.addCase(fetchFoodItemsForMeal.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ?? action.error.message ?? "Failed to fetch food items.";
    });

    builder.addCase(addFoodItem.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addFoodItem.fulfilled, (state, action) => {
      state.loading = false;
      state.items.push(action.payload);
    });
    builder.addCase(addFoodItem.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ?? action.error.message ?? "Failed to add food item.";
    });

    builder.addCase(deleteFoodItem.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteFoodItem.fulfilled, (state, action) => {
      state.loading = false;
      state.items = state.items.filter((item) => item.id !== action.payload);
    });
    builder.addCase(deleteFoodItem.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ?? action.error.message ?? "Failed to delete food item.";
    });
  },
});

export const { resetFoodItemState } = foodItemSlice.actions;
export default foodItemSlice.reducer;
