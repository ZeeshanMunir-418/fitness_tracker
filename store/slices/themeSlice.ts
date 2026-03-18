import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createAsyncThunk,
    createSlice,
    type PayloadAction,
} from "@reduxjs/toolkit";

const THEME_STORAGE_KEY = "apex_theme";

interface ThemeState {
  isDark: boolean;
  followSystem: boolean;
}

const initialState: ThemeState = {
  isDark: false,
  followSystem: true,
};

interface LoadThemeResult {
  isDark: boolean;
  followSystem: boolean;
}

interface SetThemePayload {
  isDark: boolean;
  persist?: boolean;
  followSystem?: boolean;
}

const persistTheme = async (isDark: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(isDark));
    console.log("[theme] saved preference:", isDark);
  } catch (error) {
    console.error("[theme] failed to persist preference:", error);
  }
};

const clearPersistedTheme = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(THEME_STORAGE_KEY);
    console.log("[theme] cleared saved preference");
  } catch (error) {
    console.error("[theme] failed to clear saved preference:", error);
  }
};

export const loadTheme = createAsyncThunk<LoadThemeResult>(
  "theme/loadTheme",
  async () => {
    try {
      const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);

      if (raw == null) {
        console.log("[theme] no saved preference, following system default");
        return { isDark: false, followSystem: true };
      }

      const parsed = JSON.parse(raw);
      const isDark = typeof parsed === "boolean" ? parsed : false;
      console.log("[theme] loaded manual preference:", isDark);
      return { isDark, followSystem: false };
    } catch (error) {
      console.error("[theme] failed to load preference:", error);
      return { isDark: false, followSystem: true };
    }
  },
);

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.isDark = !state.isDark;
      state.followSystem = false;
      void persistTheme(state.isDark);
    },
    setTheme: (state, action: PayloadAction<SetThemePayload>) => {
      const {
        isDark,
        persist = true,
        followSystem = persist ? false : state.followSystem,
      } = action.payload;

      state.isDark = isDark;
      state.followSystem = followSystem;

      if (persist) {
        void persistTheme(state.isDark);
      }
    },
    clearThemePreference: (state) => {
      state.followSystem = true;
      void clearPersistedTheme();
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadTheme.fulfilled, (state, action) => {
      state.isDark = action.payload.isDark;
      state.followSystem = action.payload.followSystem;
    });
  },
});

export const { toggleTheme, setTheme, clearThemePreference } =
  themeSlice.actions;
export default themeSlice.reducer;
