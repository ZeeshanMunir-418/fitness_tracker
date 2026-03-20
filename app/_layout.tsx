import "@/lib/tasks/stepCounterTask";

import InAppNotificationBanner from "@/components/InAppNotificationBanner";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { supabase } from "@/lib/supabase";
import { registerStepCounterTask } from "@/lib/tasks/stepCounterTask";
import { ThemeProvider, useTheme } from "@/lib/theme/ThemeContext";
import { store } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getSession, setSession } from "@/store/slices/authSlice";
import { loadTheme } from "@/store/slices/themeSlice";
import { DMSans_400Regular, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import "react-native-reanimated";
import { Provider } from "react-redux";
import "../globals.css";

const onboardingCacheKey = (userId: string) =>
  `apex_onboarding_completed_${userId}`;

// All three helpers are async — always await them.
const getCachedOnboardingCompleted = async (
  userId: string,
): Promise<boolean | null> => {
  try {
    const raw = await AsyncStorage.getItem(onboardingCacheKey(userId));
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  } catch {
    return null;
  }
};

const setCachedOnboardingCompleted = async (
  userId: string,
  value: boolean,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(onboardingCacheKey(userId), String(value));
  } catch {}
};

// Call this from step-8 after onboarding completes so the guard
// never hits Supabase again for this user.
export const warmOnboardingCache = async (userId: string): Promise<void> => {
  await setCachedOnboardingCompleted(userId, true);
};

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppNavigator() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const { session, initialized } = useAppSelector((s) => s.auth);
  const { isDark, colors } = useTheme();
  const [isOfflineAlertVisible, setIsOfflineAlertVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const checkInternetConnection = useCallback(async () => {
    const timeoutMs = 5000;
    const healthUrls = [
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      "https://clients3.google.com/generate_204",
    ].filter((url): url is string => typeof url === "string" && url.length > 0);

    if (healthUrls.length === 0) return true;

    for (const url of healthUrls) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeoutId);
        if (response.ok || response.status === 204) return true;
      } catch {
        clearTimeout(timeoutId);
      }
    }

    return false;
  }, []);

  useNotifications();

  useEffect(() => {
    registerStepCounterTask();
  }, []);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      const isOnline = await checkInternetConnection();
      if (isActive) setIsOfflineAlertVisible(!isOnline);
    };

    run();
    const id = setInterval(run, 10000);
    return () => {
      isActive = false;
      clearInterval(id);
    };
  }, [checkInternetConnection]);

  useEffect(() => {
    dispatch(loadTheme());
    dispatch(getSession());

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      dispatch(
        setSession({
          user: supabaseSession?.user ?? null,
          session: supabaseSession,
        }),
      );
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  // ── Navigation guard ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized) return;
    if (!isMounted) return;

    const rootSegment = segments[0] as string | undefined;
    const inAuthGroup = rootSegment === "(auth)";
    const inOnboardingGroup = rootSegment === "(onboarding)";
    const inTabsGroup = rootSegment === "(tabs)";
    const inWorkouts = rootSegment === "workouts";
    const inProfile = rootSegment === "(profile)";
    const inNotifications = rootSegment === "(notifications)";
    const inAuthCallback = rootSegment === "auth";

    const inProtectedArea =
      inTabsGroup || inWorkouts || inProfile || inNotifications;

    // ── Not logged in ────────────────────────────────────────────────────────
    if (!session) {
      if (
        inAuthGroup ||
        inAuthCallback ||
        rootSegment === undefined ||
        rootSegment === "index"
      ) {
        return;
      }
      router.replace("/");
      return;
    }

    // ── Logged in ────────────────────────────────────────────────────────────
    let isEffectActive = true;

    const checkOnboarding = async () => {
      // ✅ Already in a protected route — never redirect backwards.
      // This is the critical guard that prevents the post-onboarding flash:
      // when resetOnboarding() fires 500ms after router.replace("/(tabs)"),
      // segments[0] is already "(tabs)" so we bail out immediately here.
      if (inProtectedArea) return;

      // ✅ Await the async cache read — without await, cached is a Promise
      // object which is never === true/false/null, causing a Supabase fetch
      // on every single guard invocation and breaking cache entirely.
      const cached = await getCachedOnboardingCompleted(session.user.id);

      if (!isEffectActive) return;

      if (cached === false) {
        if (!inOnboardingGroup) router.replace("/(onboarding)/step-1");
        return;
      }

      if (cached === true) {
        // Cache says done — go to tabs if not already heading there
        if (!inOnboardingGroup) router.replace("/(tabs)");
        return;
      }

      // ── Cache miss: ask Supabase (only happens once per install) ───────────
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .single();

      if (!isEffectActive) return;

      if (error || !profile?.onboarding_completed) {
        await setCachedOnboardingCompleted(session.user.id, false);
        if (!inOnboardingGroup) router.replace("/(onboarding)/step-1");
        return;
      }

      // Warm the cache so we never hit Supabase again
      await setCachedOnboardingCompleted(session.user.id, true);

      if (!inOnboardingGroup) {
        router.replace("/(tabs)");
      }
    };

    checkOnboarding();

    return () => {
      isEffectActive = false;
    };
  }, [initialized, isMounted, session, router, segments]);

  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(notifications)" options={{ headerShown: false }} />
        <Stack.Screen name="(profile)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workouts" options={{ headerShown: false }} />
      </Stack>

      <Modal
        visible={isOfflineAlertVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          className="px-6"
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          />
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 2,
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{ color: colors.text }}
              className="text-2xl font-dmsans-bold"
            >
              No Internet Connection
            </Text>
            <Text
              style={{ color: colors.textMuted }}
              className="mt-2 font-dmsans text-base"
            >
              We could not reach the network. Please check your connection and
              try again.
            </Text>
            <Pressable
              style={{
                marginTop: 20,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: colors.border,
                backgroundColor: colors.text,
                paddingHorizontal: 20,
                paddingVertical: 12,
                alignItems: "center",
              }}
              onPress={async () => {
                const isOnline = await checkInternetConnection();
                setIsOfflineAlertVisible(!isOnline);
              }}
            >
              <Text
                style={{ color: colors.background }}
                className="font-dmsans-bold"
              >
                Retry
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <StatusBar style={isDark ? "light" : "dark"} />
      <InAppNotificationBanner />
    </>
  );
}

function ThemedAppNavigator() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppNavigator />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "DMSans-Regular": DMSans_400Regular,
    "DMSans-Bold": DMSans_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <Provider store={store}>
      <ThemeProvider>
        <ThemedAppNavigator />
      </ThemeProvider>
    </Provider>
  );
}
