import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export type GenderType = "male" | "female" | "prefer_not_to_say";
export type GoalType =
  | "lose_weight"
  | "build_muscle"
  | "improve_endurance"
  | "improve_flexibility"
  | "maintain_weight";
export type ActivityLevelType =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "athlete";
export type WorkoutType =
  | "strength_training"
  | "cardio"
  | "hiit"
  | "yoga_flexibility"
  | "mixed";
export type WorkoutDurationType = "15_30" | "30_45" | "45_60" | "60_plus";
export type DietaryPreferenceType =
  | "no_restriction"
  | "vegetarian"
  | "vegan"
  | "halal"
  | "keto"
  | "high_protein";
export type PreferredTimeType = "morning" | "afternoon" | "evening";

export interface Profile {
  id: string;
  full_name: string | null;
  age: number | null;
  gender: GenderType | null;
  height: number | null;
  height_unit: string | null;
  current_weight: number | null;
  weight_unit: string | null;
  primary_goal: GoalType | null;
  activity_level: ActivityLevelType | null;
  preferred_workout_type: WorkoutType | null;
  workout_duration: WorkoutDurationType | null;
  workout_days_per_week: number | null;
  dietary_preference: DietaryPreferenceType | null;
  daily_water_goal_liters: number | null;
  tracks_calories: boolean | null;
  target_weight: number | null;
  target_date: string | null;
  weekly_weight_change_kg: number | null;
  workout_reminders: boolean | null;
  preferred_workout_time: PreferredTimeType | null;
  meal_reminders: boolean | null;
  bmi: number | null;
  bmr: number | null;
  daily_calorie_target: number | null;
  onboarding_completed: boolean | null;
  avatar_url: string | null;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileInput extends Partial<Profile> {}

export interface ProfileState {
  data: Profile | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  data: null,
  loading: false,
  error: null,
};

type ThunkConfig = { state: RootState; rejectValue: string };

/**
 * Fetches profile data for the currently authenticated user.
 */
export const fetchProfile = createAsyncThunk<Profile | null, void, ThunkConfig>(
  "profile/fetchProfile",
  async (_, { getState, rejectWithValue }) => {
    console.log("[profile] fetchProfile start");

    try {
      const userId = getState().auth.user?.id;

      if (!userId) {
        throw new Error("User is not authenticated.");
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("[profile] fetchProfile failed", error);
        return rejectWithValue(error.message);
      }

      const profile = (data ?? null) as Profile | null;

      console.log("[profile] fetchProfile end", {
        found: Boolean(profile),
      });
      return profile;
    } catch (error) {
      console.error("[profile] fetchProfile failed", error);
      const message =
        error instanceof Error ? error.message : "Failed to fetch profile.";
      return rejectWithValue(message);
    }
  },
);

/**
 * Updates profile fields for the currently authenticated user.
 */
export const updateProfile = createAsyncThunk<
  Profile,
  UpdateProfileInput,
  ThunkConfig
>("profile/updateProfile", async (payload, { getState, rejectWithValue }) => {
  console.log("[profile] updateProfile start", payload);

  try {
    const userId = getState().auth.user?.id;

    if (!userId) {
      throw new Error("User is not authenticated.");
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      console.error("[profile] updateProfile failed", error);
      return rejectWithValue(error.message);
    }

    const profile = data as Profile;
    console.log("[profile] updateProfile end", {
      id: profile.id,
    });
    return profile;
  } catch (error) {
    console.error("[profile] updateProfile failed", error);
    const message =
      error instanceof Error ? error.message : "Failed to update profile.";
    return rejectWithValue(message);
  }
});

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setProfileData(state, action: { payload: Profile | null }) {
      state.data = action.payload;
    },
    setProfileLoading(state, action: { payload: boolean }) {
      state.loading = action.payload;
    },
    setProfileError(state, action: { payload: string | null }) {
      state.error = action.payload;
    },
    clearProfile(state) {
      state.data = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.data = action.payload;
    });
    builder.addCase(fetchProfile.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ?? action.error.message ?? "Failed to fetch profile.";
    });

    builder.addCase(updateProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.data = action.payload;
    });
    builder.addCase(updateProfile.rejected, (state, action) => {
      state.loading = false;
      state.error =
        action.payload ?? action.error.message ?? "Failed to update profile.";
    });
  },
});

export const {
  setProfileData,
  setProfileLoading,
  setProfileError,
  clearProfile,
} = profileSlice.actions;
export default profileSlice.reducer;
