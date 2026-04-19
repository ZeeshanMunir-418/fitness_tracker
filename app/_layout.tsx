import "@/lib/tasks/stepCounterTask";

import InAppNotificationBanner from "@/components/InAppNotificationBanner";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { usePushToken } from "@/lib/hooks/usePushToken";
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
import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import "react-native-reanimated";
import { Provider } from "react-redux";
import "../globals.css";

// ── Onboarding cache ───────────────────────────────────────────────────────────

const onboardingCacheKey = (userId: string) =>
  `apex_onboarding_completed_${userId}`;

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

export const warmOnboardingCache = async (userId: string): Promise<void> => {
  await setCachedOnboardingCompleted(userId, true);
};

export const unstable_settings = {
  anchor: "(auth)",
};

// ── Auth link helpers ──────────────────────────────────────────────────────────

const resolveAuthUrlFromIncoming = (incomingUrl: string): string | null => {
  let current = incomingUrl;
  for (let depth = 0; depth < 4; depth += 1) {
    if (
      current.includes("auth/callback") ||
      current.includes("/auth/v1/verify")
    ) {
      return current;
    }
    const parsed = Linking.parse(current);
    const nestedUrl = parsed.queryParams?.url;
    if (typeof nestedUrl !== "string" || nestedUrl.length === 0) break;
    const decoded = decodeURIComponent(nestedUrl);
    if (!decoded || decoded === current) break;
    current = decoded;
  }
  return null;
};

const getParam = (
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | null => {
  const value = params[key];
  if (typeof value === "string" && value.length > 0) return value;
  if (
    Array.isArray(value) &&
    typeof value[0] === "string" &&
    value[0].length > 0
  )
    return value[0];
  return null;
};

const getFragmentParams = (url: string): URLSearchParams => {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return new URLSearchParams();
  return new URLSearchParams(url.slice(hashIndex + 1));
};

const processAuthCallbackUrl = async (
  source: "initial" | "listener",
  incomingUrl: string,
): Promise<void> => {
  const resolvedUrl = resolveAuthUrlFromIncoming(incomingUrl);
  if (!resolvedUrl) return;

  const parsed = Linking.parse(resolvedUrl);
  const query = parsed.queryParams ?? {};
  const fragment = getFragmentParams(resolvedUrl);

  const token = getParam(query, "token");
  const type = getParam(query, "type") ?? "signup";
  const accessToken =
    getParam(query, "access_token") ?? fragment.get("access_token");
  const refreshToken =
    getParam(query, "refresh_token") ?? fragment.get("refresh_token");
  const code = getParam(query, "code");

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error)
      console.error("[auth-link] setSession failed", {
        source,
        message: error.message,
      });
    return;
  }

  if (token) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as any,
    });
    if (error)
      console.error("[auth-link] verifyOtp failed", {
        source,
        message: error.message,
      });
    return;
  }

  if (!code && !resolvedUrl.includes("auth/callback")) return;

  const { error } = await supabase.auth.exchangeCodeForSession(resolvedUrl);
  if (error)
    console.error("[auth-link] exchange failed", {
      source,
      message: error.message,
    });
};

// ── Nav destination type ───────────────────────────────────────────────────────

type NavDestination = "loading" | "login" | "onboarding" | "tabs";

// ── AppNavigator ───────────────────────────────────────────────────────────────

function AppNavigator() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const { session: authSession, initialized } = useAppSelector((s) => s.auth);
  const { isDark, colors } = useTheme();

  // Single source of truth for where we should be
  const [destination, setDestination] = useState<NavDestination>("loading");
  const [isOfflineAlertVisible, setIsOfflineAlertVisible] = useState(false);

  // Prevent duplicate navigations
  const lastNavigated = useRef<NavDestination | null>(null);

  // ── Internet check ─────────────────────────────────────────────────────────

  const checkInternetConnection = useCallback(async () => {
    const healthUrls = [
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      "https://clients3.google.com/generate_204",
    ].filter((url): url is string => typeof url === "string" && url.length > 0);

    if (healthUrls.length === 0) return true;

    for (const url of healthUrls) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
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
  usePushToken();

  // ── Side effects ───────────────────────────────────────────────────────────

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
    Linking.getInitialURL()
      .then((url) => {
        if (url) void processAuthCallbackUrl("initial", url);
      })
      .catch((e) => console.error("[auth-link] initial URL error", String(e)));

    const sub = Linking.addEventListener("url", ({ url }) => {
      void processAuthCallbackUrl("listener", url);
    });
    return () => sub.remove();
  }, []);

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

  // ── Core routing logic — runs once initialized, resolves destination ────────

  useEffect(() => {
    if (!initialized) return;

    // No session → login
    if (!authSession) {
      setDestination("login");
      return;
    }

    let isActive = true;
    const userId = authSession.user.id;

    const resolve = async () => {
      // ── Optimistic: trust cache immediately ──────────────────────────────
      const cached = await getCachedOnboardingCompleted(userId);

      if (!isActive) return;

      if (cached === true) {
        // Optimistically go to tabs — verify in background
        setDestination("tabs");
      } else if (cached === false) {
        setDestination("onboarding");
      }
      // cached === null → stay on "loading" until DB responds

      // ── Verify against DB ────────────────────────────────────────────────
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userId)
        .single();

      if (!isActive) return;

      if (error) {
        const code = String((error as any)?.code ?? "");
        const msg = String((error as any)?.message ?? "").toLowerCase();
        const det = String((error as any)?.details ?? "").toLowerCase();

        const isMissingRow =
          code === "PGRST116" ||
          msg.includes("no rows") ||
          det.includes("0 rows");

        if (isMissingRow) {
          await setCachedOnboardingCompleted(userId, false);
          setDestination("onboarding");
          return;
        }

        // DB unreachable — fall back to cache, default to onboarding if no cache
        setDestination(cached === true ? "tabs" : "onboarding");
        return;
      }

      const completed = Boolean(profile?.onboarding_completed);
      await setCachedOnboardingCompleted(userId, completed);
      setDestination(completed ? "tabs" : "onboarding");
    };

    resolve();
    return () => {
      isActive = false;
    };
  }, [initialized, authSession]);

  // ── Navigate when destination changes ─────────────────────────────────────

  useEffect(() => {
    if (destination === "loading") return;
    if (lastNavigated.current === destination) return;

    const rootSegment = segments[0] as string | undefined;
    const inAuthCallback = rootSegment === "auth";

    // Never interrupt an in-flight OAuth callback
    if (inAuthCallback) return;

    lastNavigated.current = destination;

    switch (destination) {
      case "login":
        router.replace("/login");
        break;
      case "onboarding":
        router.replace("/(onboarding)/step-1");
        break;
      case "tabs":
        router.replace("/(tabs)");
        break;
    }
  }, [destination, segments, router]);

  // ── Render ─────────────────────────────────────────────────────────────────

  // Block render entirely until we know where to go
  // (spinner only shows when there's no cache hit — typically first install)
  if (destination === "loading") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(notifications)" options={{ headerShown: false }} />
        <Stack.Screen name="(profile)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workouts" options={{ headerShown: false }} />
        <Stack.Screen name="scan" options={{ headerShown: false }} />
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

// ── Wrappers ───────────────────────────────────────────────────────────────────

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
