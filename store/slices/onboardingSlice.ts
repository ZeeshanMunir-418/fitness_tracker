import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";
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
  avatarUri: string | null;
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
    avatarUri: null,
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
>(
  "onboarding/saveOnboardingProfile",
  async (_, { getState, rejectWithValue }) => {
    console.log("[onboarding] saveOnboardingProfile: start");
    const state = getState();
    const { data } = state.onboarding;

    let userId = state.auth.user?.id;
    let accessToken: string | null = null;

    if (!userId) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.error("[onboarding] getUser failed", error);
        return rejectWithValue(error?.message ?? "User not found.");
      }

      userId = user.id;
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    const expiresAt = sessionData?.session?.expires_at ?? 0;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const isExpiringSoon = expiresAt - nowInSeconds < 60;

    if (isExpiringSoon) {
      const { data: refreshed, error: refreshError } =
        await supabase.auth.refreshSession();
      if (refreshError || !refreshed.session) {
        return rejectWithValue("Session expired. Please log in again.");
      }
      accessToken = refreshed.session.access_token;
    } else {
      accessToken = sessionData.session!.access_token;
    }

    const payload: Record<string, unknown> = {
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

    if (data.avatarUri) {
      try {
        const fileExtMatch = data.avatarUri.split("?")[0]?.split(".").pop();
        const fileExt = fileExtMatch ? fileExtMatch.toLowerCase() : "jpg";
        const contentType = fileExt === "png" ? "image/png" : "image/jpeg";
        const filePath = `${userId}/avatar.${fileExt}`;

        const avatarResponse = await fetch(data.avatarUri);
        const avatarArrayBuffer = await avatarResponse.arrayBuffer();
        const avatarBytes = new Uint8Array(avatarArrayBuffer);

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarBytes, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.error("[onboarding] avatar upload failed", uploadError);
          return rejectWithValue(uploadError.message);
        }

        const bucketUrl = process.env.EXPO_PUBLIC_SUPABASE_BUCKET_URL;
        if (bucketUrl) {
          const publicUrl = `${bucketUrl}/avatars/${filePath}`;
          payload.avatar_url = publicUrl;
        }
      } catch (error) {
        console.error("[onboarding] avatar upload error", error);
        const message =
          error instanceof Error ? error.message : "Failed to upload avatar.";
        return rejectWithValue(message);
      }
    }

    const { error: dbError } = await supabase.from("profiles").upsert(payload, {
      onConflict: "id",
    });

    if (dbError) {
      console.error("[onboarding] profile upsert failed", dbError);
      return rejectWithValue(dbError.message);
    }

    // Remove the entire axios import and the axios.post block, replace with:
    const fnName = "personalized_workout_and_meal_plan";

    try {
      console.log("[onboarding] calling edge function", fnName);
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        fnName,
        {
          body: payload,
        },
      );

      if (fnError) {
        // Extract the real error message from the response body
        let message = fnError.message ?? "Failed to generate plan.";
        try {
          const body = await (fnError as any).context?.json();
          console.error("[onboarding] edge function error body", body);
          message = body?.error ?? body?.message ?? message;
        } catch {
          console.error(
            "[onboarding] edge function error (no body)",
            fnError.message,
          );
        }
        return rejectWithValue(message);
      }

      console.log("[onboarding] edge function response", fnData);
    } catch (error) {
      console.error("[onboarding] fn call failed", error);
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      return rejectWithValue(message);
    }
    console.log("[onboarding] saveOnboardingProfile: success");
  },
);

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    updateOnboardingData: (
      state,
      action: PayloadAction<Partial<OnboardingData>>,
    ) => {
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
