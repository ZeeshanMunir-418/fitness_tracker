import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import nutritionReducer from "./slices/nutritionSlice";
import onboardingReducer from "./slices/onboardingSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    onboarding: onboardingReducer,
    nutrition: nutritionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;