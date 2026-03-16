import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../index";

export type Gender = "male" | "female" | "prefer_not_to_say" | null;
export type HeightUnit = "cm" | "ft";
export type WeightUnit = "kg" | "lbs";
export type PrimaryGoal =
  | "lose_weight"
  | "build_muscle"
  | "improve_endurance"
  | "improve_flexibility"
  | "maintain_weight"
  | null;
export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "athlete"
  | null;
export type PreferredWorkoutType =
  | "strength_training"
  | "cardio"
  | "hiit"
  | "yoga_flexibility"
  | "mixed"
  | null;
export type WorkoutDuration = "15_30" | "30_45" | "45_60" | "60_plus" | null;
export type DietaryPreference =
  | "no_restriction"
  | "vegetarian"
  | "vegan"
  | "halal"
  | "keto"
  | "high_protein"
  | null;
export type PreferredWorkoutTime = "morning" | "afternoon" | "evening" | null;

interface OnboardingData {
  fullName: string;
  age: number | null;
  gender: Gender;
  height: number | null;
  heightUnit: HeightUnit;
  currentWeight: number | null;
  weightUnit: WeightUnit;
  primaryGoal: PrimaryGoal;
  activityLevel: ActivityLevel;
  preferredWorkoutType: PreferredWorkoutType;
  workoutDuration: WorkoutDuration;
  workoutDaysPerWeek: number | null;
  dietaryPreference: DietaryPreference;
  dailyWaterGoalLiters: number;
  tracksCalories: boolean;
  targetWeight: number | null;
  targetDate: string | null;
  weeklyWeightChangeKg: number | null;
  workoutReminders: boolean;
  preferredWorkoutTime: PreferredWorkoutTime;
  mealReminders: boolean;
}

interface OnboardingState {
  currentStep: number;
  loading: boolean;
  error: string | null;
  data: OnboardingData;
}

const initialState: OnboardingState = {
  currentStep: 1,
  loading: false,
  error: null,
  data: {
    fullName: "",
    age: null,
    gender: null,
    height: null,
    heightUnit: "cm",
    currentWeight: null,
    weightUnit: "kg",
    primaryGoal: null,
    activityLevel: null,
    preferredWorkoutType: null,
    workoutDuration: null,
    workoutDaysPerWeek: null,
    dietaryPreference: null,
    dailyWaterGoalLiters: 2,
    tracksCalories: true,
    targetWeight: null,
    targetDate: null,
    weeklyWeightChangeKg: null,
    workoutReminders: true,
    preferredWorkoutTime: null,
    mealReminders: true,
  },
};

export const saveOnboardingProfile = createAsyncThunk<
  void,
  void,
  { state: RootState; rejectValue: string }
>("onboarding/saveOnboardingProfile", async (_, { getState, rejectWithValue }) => {
  const state = getState();
  const { data } = state.onboarding;

  let userId = state.auth.user?.id;

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return rejectWithValue(error?.message ?? "User not found.");
    }

    userId = user.id;
  }

  const payload = {
    id: userId,
    full_name: data.fullName,
    age: data.age,
    gender: data.gender,
    height: data.height,
    height_unit: data.heightUnit,
    current_weight: data.currentWeight,
    weight_unit: data.weightUnit,
    primary_goal: data.primaryGoal,
    activity_level: data.activityLevel,
    preferred_workout_type: data.preferredWorkoutType,
    workout_duration: data.workoutDuration,
    workout_days_per_week: data.workoutDaysPerWeek,
    dietary_preference: data.dietaryPreference,
    daily_water_goal_liters: data.dailyWaterGoalLiters,
    tracks_calories: data.tracksCalories,
    target_weight: data.targetWeight,
    target_date: data.targetDate,
    weekly_weight_change_kg: data.weeklyWeightChangeKg,
    workout_reminders: data.workoutReminders,
    preferred_workout_time: data.preferredWorkoutTime,
    meal_reminders: data.mealReminders,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    return rejectWithValue(error.message);
  }
});

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    updateOnboardingData: (state, action: PayloadAction<Partial<OnboardingData>>) => {
      state.data = { ...state.data, ...action.payload };
    },
    nextStep: (state) => {
      state.currentStep = Math.min(8, state.currentStep + 1);
    },
    prevStep: (state) => {
      state.currentStep = Math.max(1, state.currentStep - 1);
    },
    resetOnboarding: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(saveOnboardingProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(saveOnboardingProfile.fulfilled, (state) => {
      state.loading = false;
      state.error = null;
    });
    builder.addCase(saveOnboardingProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ?? "Failed to save onboarding profile.";
    });
  },
});

export const { updateOnboardingData, nextStep, prevStep, resetOnboarding } =
  onboardingSlice.actions;
export default onboardingSlice.reducer;
