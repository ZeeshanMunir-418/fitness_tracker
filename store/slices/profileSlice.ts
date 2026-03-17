import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../index";

export type ProfileData = {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  [key: string]: string | number | boolean | null | undefined;
};

interface ProfileState {
  data: ProfileData | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  data: null,
  loading: false,
  error: null,
};

export const fetchProfile = createAsyncThunk<
  ProfileData,
  string | undefined,
  { state: RootState; rejectValue: string }
>(
  "profile/fetchProfile",
  async (providedUserId, { getState, rejectWithValue }) => {
    let userId = providedUserId ?? getState().auth.user?.id;

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

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return rejectWithValue(error.message);
    }

    if (!data) {
      return rejectWithValue("Profile not found.");
    }

    return data as ProfileData;
  },
);

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setProfileData(state, action) {
      state.data = action.payload;
    },
    setProfileLoading(state, action) {
      state.loading = action.payload;
    },
    setProfileError(state, action) {
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
  },
});

export const {
  setProfileData,
  setProfileLoading,
  setProfileError,
  clearProfile,
} = profileSlice.actions;
export default profileSlice.reducer;
