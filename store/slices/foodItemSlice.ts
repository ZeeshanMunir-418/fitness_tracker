import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../index";

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

export const fetchFoodItemsForMeal = createAsyncThunk<
  FoodItem[],
  string, // daily_meal_id
  ThunkConfig
>(
  "foodItem/fetchFoodItemsForMeal",
  async (dailyMealId, { getState, rejectWithValue }) => {
    const userId = getState().auth.user?.id;
    if (!userId) return rejectWithValue("User is not authenticated.");

    const { data, error } = await supabase
      .from("food_items")
      .select("*")
      .eq("daily_meal_id", dailyMealId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[foodItem] fetchFoodItemsForMeal failed", error);
      return rejectWithValue(error.message);
    }

    return (data ?? []) as FoodItem[];
  },
);

export const addFoodItem = createAsyncThunk<
  FoodItem,
  Omit<FoodItem, "id" | "created_at">,
  ThunkConfig
>("foodItem/addFoodItem", async (payload, { getState, rejectWithValue }) => {
  const userId = getState().auth.user?.id;
  if (!userId) return rejectWithValue("User is not authenticated.");

  const { data, error } = await supabase
    .from("food_items")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("[foodItem] addFoodItem failed", error);
    return rejectWithValue(error.message);
  }

  return data as FoodItem;
});

export const deleteFoodItem = createAsyncThunk<string, string, ThunkConfig>(
  "foodItem/deleteFoodItem",
  async (id, { getState, rejectWithValue }) => {
    const userId = getState().auth.user?.id;
    if (!userId) return rejectWithValue("User is not authenticated.");

    const { error } = await supabase.from("food_items").delete().eq("id", id);

    if (error) {
      console.error("[foodItem] deleteFoodItem failed", error);
      return rejectWithValue(error.message);
    }

    return id;
  },
);

const foodItemSlice = createSlice({
  name: "foodItem",
  initialState,
  reducers: {
    resetFoodItemState: () => initialState,
  },
  extraReducers: (builder) => {
    // fetchFoodItemsForMeal
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

    // addFoodItem
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

    // deleteFoodItem
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
