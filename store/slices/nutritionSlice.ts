import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

export interface FoodItem {
  foodId: string;
  foodName: string;
  servingSize: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

interface NutritionState {
  searchResults: FoodItem[];
  loading: boolean;
  error: string | null;
}

const initialState: NutritionState = {
  searchResults: [],
  loading: false,
  error: null,
};

export const searchFood = createAsyncThunk(
  "nutrition/searchFood",
  async (query: string, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        process.env.EXPO_PUBLIC_SUPABASE_SEARCH_FN_URL!,
        {
          params: { q: query },
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
        },
      );
      return res.data.results as FoodItem[];
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  },
);

const nutritionSlice = createSlice({
  name: "nutrition",
  initialState,
  reducers: {
    clearResults: (state) => {
      state.searchResults = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchFood.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchFood.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchFood.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearResults } = nutritionSlice.actions;
export default nutritionSlice.reducer;
