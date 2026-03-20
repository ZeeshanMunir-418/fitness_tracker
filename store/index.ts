import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import dailyMealReducer from "./slices/dailyMealSlice";
import foodItemReducer from "./slices/foodItemSlice";
import mealPlanReducer from "./slices/mealPlanSlice";
import notificationReducer, {
    type NotificationState,
} from "./slices/notificationSlice";
import nutritionReducer from "./slices/nutritionSlice";
import onboardingReducer from "./slices/onboardingSlice";
import profileReducer from "./slices/profileSlice";
import themeReducer from "./slices/themeSlice";
import workoutLogReducer from "./slices/workoutLogSlice";
import workoutPlanReducer from "./slices/workoutPlanSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dailyMeal: dailyMealReducer,
    foodItem: foodItemReducer,
    mealPlan: mealPlanReducer,
    onboarding: onboardingReducer,
    notifications: notificationReducer as (
      state: NotificationState | undefined,
      action: { type: string; payload?: unknown },
    ) => NotificationState,
    nutrition: nutritionReducer,
    profile: profileReducer,
    theme: themeReducer,
    workoutLog: workoutLogReducer,
    workoutPlan: workoutPlanReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
