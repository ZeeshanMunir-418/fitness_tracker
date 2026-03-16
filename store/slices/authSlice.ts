import { supabase } from "@/lib/supabase";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Session, User } from "@supabase/supabase-js";
import Constants from "expo-constants";

type GoogleSigninModule =
  typeof import("@react-native-google-signin/google-signin");

const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;

const isExpoGo = Constants.executionEnvironment === "storeClient";

const getGoogleSignin = async () => {
  if (isExpoGo) {
    throw new Error(
      "Google Sign-In requires a development build. Expo Go does not include the native Google Sign-In module.",
    );
  }

  const { GoogleSignin } =
    ((await import(
      "@react-native-google-signin/google-signin"
    )) as GoogleSigninModule);
  return GoogleSignin;
};

const configureGoogleSignIn = async () => {
  const GoogleSignin = await getGoogleSignin();

  GoogleSignin.configure({
    webClientId: googleWebClientId,
  });

  return GoogleSignin;
};

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: false,
  initialized: false,
  error: null,
};

export const getSession = createAsyncThunk(
  "auth/getSession",
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase.auth.getSession();
    if (error) return rejectWithValue(error.message);
    return data;
  },
);

export const signIn = createAsyncThunk(
  "auth/signIn",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return rejectWithValue(error.message);
    return data;
  },
);

export const signUp = createAsyncThunk(
  "auth/signUp",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return rejectWithValue(error.message);
    return data;
  },
);

export const signOut = createAsyncThunk(
  "auth/signOut",
  async (_, { rejectWithValue }) => {
    const { error } = await supabase.auth.signOut();
    if (error) return rejectWithValue(error.message);

    try {
      const GoogleSignin = await getGoogleSignin();
      await GoogleSignin.signOut();
    } catch {
      // Ignore Google SDK sign-out failures after Supabase session has been cleared.
    }
  },
);

export const signInWithGoogle = createAsyncThunk<void, void>(
  "auth/signInWithGoogle",
  async (_, { rejectWithValue }) => {
    try {
      if (isExpoGo) {
        return rejectWithValue(
          "Google Sign-In requires a development build. Install and open the native app instead of Expo Go.",
        );
      }

      if (!googleWebClientId) {
        return rejectWithValue("Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.");
      }

      const GoogleSignin = await configureGoogleSignIn();

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const result = await GoogleSignin.signIn();

      if (result.type !== "success") {
        return rejectWithValue("Google sign-in was cancelled or failed.");
      }

      const idToken = result.data.idToken;

      if (!idToken) {
        return rejectWithValue("Google sign-in did not return an ID token.");
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) return rejectWithValue(error.message);
    } catch (err: any) {
      return rejectWithValue(err.message ?? "Unexpected Google sign-in error.");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (
      state,
      action: PayloadAction<{ user: User | null; session: Session | null }>,
    ) => {
      state.user = action.payload.user;
      state.session = action.payload.session;
      state.loading = false;
    },
    clearAuth: (state) => {
      state.user = null;
      state.session = null;
      state.loading = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // getSession
    builder.addCase(getSession.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getSession.fulfilled, (state, action) => {
      state.loading = false;
      state.initialized = true;
      state.session = action.payload.session;
      state.user = action.payload.session?.user ?? null;
    });
    builder.addCase(getSession.rejected, (state) => {
      state.loading = false;
      state.initialized = true;
    });

    // signIn
    builder.addCase(signIn.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signIn.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.session = action.payload.session;
    });
    builder.addCase(signIn.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // signUp
    builder.addCase(signUp.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signUp.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.session = action.payload.session;
    });
    builder.addCase(signUp.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // signOut
    builder.addCase(signOut.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(signOut.fulfilled, (state) => {
      state.loading = false;
      state.user = null;
      state.session = null;
      state.error = null;
    });
    builder.addCase(signOut.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // signInWithGoogle
    builder.addCase(signInWithGoogle.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signInWithGoogle.fulfilled, (state) => {
      state.loading = false;
      // No user or session is set here; handled after OAuth redirect.
    });
    builder.addCase(signInWithGoogle.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { setSession, clearAuth, clearError } = authSlice.actions;
export default authSlice.reducer;
