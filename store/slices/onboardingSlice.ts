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
  progressStep: number;
  planGenerationLoading: boolean;
  planGenerationProgress: number;
  planGenerationMessage: string;
  planGenerationError: string | null;
  data: OnboardingData;
}

const initialState: OnboardingState = {
  currentStep: 1,
  loading: false,
  error: null,
  progressStep: 0,
  planGenerationLoading: false,
  planGenerationProgress: 0,
  planGenerationMessage: "",
  planGenerationError: null,
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
  Record<string, unknown>,
  void,
  { state: RootState; rejectValue: string }
>(
  "onboarding/saveOnboardingProfile",
  async (_, { getState, dispatch, rejectWithValue }) => {
    const state = getState();
    const { data } = state.onboarding;

    dispatch(setProgressStep(1));

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

    if (sessionError || !sessionData.session) {
      return rejectWithValue(
        "Could not retrieve session. Please log in again.",
      );
    }

    const expiresAt = sessionData.session.expires_at ?? 0;
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
      accessToken = sessionData.session.access_token;
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
      dispatch(setProgressStep(2));
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
          .upload(filePath, avatarBytes, { contentType, upsert: true });

        if (uploadError) {
          console.error("[onboarding] avatar upload failed", uploadError);
          return rejectWithValue(uploadError.message);
        }

        const bucketUrl = process.env.EXPO_PUBLIC_SUPABASE_BUCKET_URL;
        if (bucketUrl) {
          payload.avatar_url = `${bucketUrl}/avatars/${filePath}`;
        }
      } catch (error) {
        console.error("[onboarding] avatar upload error", error);
        const message =
          error instanceof Error ? error.message : "Failed to upload avatar.";
        return rejectWithValue(message);
      }
    }

    // ── Phase 3: upsert profile row ────────────────────────────────────────
    dispatch(setProgressStep(3));

    const { error: dbError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (dbError) {
      console.error("[onboarding] profile upsert failed", dbError);
      return rejectWithValue(dbError.message);
    }

    dispatch(setProgressStep(4));

    return payload;
  },
);

export const generateWorkoutPlan = createAsyncThunk<
  void,
  Record<string, unknown>,
  { state: RootState; rejectValue: string }
>(
  "onboarding/generateWorkoutPlan",
  async (payload, { dispatch, rejectWithValue }) => {
    console.log("[onboarding] generating workout plan in background...");

    dispatch(
      setPlanGenerationProgress({
        progress: 15,
        message: "Starting AI coach...",
      }),
    );

    try {
      dispatch(
        setPlanGenerationProgress({
          progress: 30,
          message: "Checking your secure session...",
        }),
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return rejectWithValue("No active session token found.");
      }

      dispatch(
        setPlanGenerationProgress({
          progress: 55,
          message: "Sending your profile to the AI planner...",
        }),
      );

      const { data, error } = await supabase.functions.invoke(
        "generate-workout-plan",
        {
          body: payload,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (error) {
        try {
          const body = await (error as any).context?.json?.();
          if (body) {
            console.error(
              "[onboarding] workout plan generation error body",
              body,
            );
            return rejectWithValue(
              body?.error ?? body?.message ?? error.message,
            );
          }
        } catch {}

        console.error("[onboarding] workout plan generation failed", error);
        return rejectWithValue(error.message);
      }

      dispatch(
        setPlanGenerationProgress({
          progress: 85,
          message: "Finalizing your workout blueprint...",
        }),
      );

      console.log("[onboarding] workout plan generation succeeded", data);

      return void 0;
    } catch (error) {
      console.error("[onboarding] workout plan generation failed", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate workout plan.";
      return rejectWithValue(message);
    }
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
    setProgressStep: (state, action: PayloadAction<number>) => {
      state.progressStep = action.payload;
    },
    setPlanGenerationProgress: (
      state,
      action: PayloadAction<{ progress: number; message: string }>,
    ) => {
      state.planGenerationLoading = true;
      state.planGenerationError = null;
      state.planGenerationProgress = Math.max(
        0,
        Math.min(100, action.payload.progress),
      );
      state.planGenerationMessage = action.payload.message;
    },
    resetPlanGenerationState: (state) => {
      state.planGenerationLoading = false;
      state.planGenerationProgress = 0;
      state.planGenerationMessage = "";
      state.planGenerationError = null;
    },
    resetOnboarding: () => initialState,
  },
  extraReducers: (builder) => {
    // ── saveOnboardingProfile ──
    builder.addCase(saveOnboardingProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
      state.progressStep = 0;
    });
    builder.addCase(saveOnboardingProfile.fulfilled, (state) => {
      state.loading = false;
      state.error = null;
      // progressStep stays at 4 so the UI can react and navigate
    });
    builder.addCase(saveOnboardingProfile.rejected, (state, action) => {
      state.loading = false;
      state.progressStep = 0;
      state.error = action.payload ?? "Failed to save onboarding profile.";
    });

    // ── generateWorkoutPlan (background — UI doesn't block on this) ──
    builder.addCase(generateWorkoutPlan.pending, (state) => {
      state.planGenerationLoading = true;
      state.planGenerationError = null;
      state.planGenerationProgress = Math.max(state.planGenerationProgress, 20);
      if (!state.planGenerationMessage) {
        state.planGenerationMessage = "Preparing your personalized plan...";
      }
    });
    builder.addCase(generateWorkoutPlan.fulfilled, (state) => {
      state.planGenerationLoading = false;
      state.planGenerationError = null;
      state.planGenerationProgress = 100;
      state.planGenerationMessage = "Your AI workout plan is ready.";
    });
    builder.addCase(generateWorkoutPlan.rejected, (state, action) => {
      state.planGenerationLoading = false;
      state.planGenerationProgress = 100;
      state.planGenerationError =
        action.payload ?? "Failed to generate workout plan.";
      state.planGenerationMessage = "We could not finish generating your plan.";
    });
  },
});

export const {
  updateOnboardingData,
  nextStep,
  prevStep,
  setProgressStep,
  setPlanGenerationProgress,
  resetPlanGenerationState,
  resetOnboarding,
} = onboardingSlice.actions;
export default onboardingSlice.reducer;
