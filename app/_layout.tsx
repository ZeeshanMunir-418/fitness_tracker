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
import * as Linking from "expo-linking";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import "react-native-reanimated";
import { Provider } from "react-redux";
import "../globals.css";

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

    if (typeof nestedUrl !== "string" || nestedUrl.length === 0) {
      break;
    }

    const decoded = decodeURIComponent(nestedUrl);
    if (!decoded || decoded === current) {
      break;
    }

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

  console.log("[auth-link] received", {
    source,
    incomingUrl,
    resolvedUrl,
  });

  if (!resolvedUrl) {
    console.log("[auth-link] ignored non-callback URL", { source });
    return;
  }

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

    if (error) {
      console.error("[auth-link] setSession failed", {
        source,
        message: error.message,
      });
    } else {
      console.log("[auth-link] setSession succeeded", { source });
    }
    return;
  }

  if (token) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as any,
    });

    if (error) {
      console.error("[auth-link] verifyOtp failed", {
        source,
        message: error.message,
      });
    } else {
      console.log("[auth-link] verifyOtp succeeded", { source });
    }
    return;
  }

  if (!code && !resolvedUrl.includes("auth/callback")) {
    console.log("[auth-link] no auth payload found", {
      source,
      resolvedUrl,
    });
    return;
  }

  const { error } = await supabase.auth.exchangeCodeForSession(resolvedUrl);

  if (error) {
    console.error("[auth-link] exchange failed", {
      source,
      message: error.message,
    });
  } else {
    console.log("[auth-link] exchange succeeded", { source });
  }
};

function AppNavigator() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { session: authSession, initialized } = useAppSelector((s) => s.auth);
  const { isDark, colors } = useTheme();
  const [isOfflineAlertVisible, setIsOfflineAlertVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const segmentText = segments.length ? segments.join("/") : "(root)";
    console.log("[nav] render", {
      pathname,
      segment: segmentText,
      rootSegment,
      initialized,
      hasSession: Boolean(authSession),
      userId: authSession?.user?.id ?? null,
    });
  }, [pathname, segments, rootSegment, initialized, authSession]);

  useEffect(() => {
    Linking.getInitialURL()
      .then((initialUrl) => {
        console.log("[auth-link] initial URL", { url: initialUrl });
        if (initialUrl) {
          void processAuthCallbackUrl("initial", initialUrl);
        }
      })
      .catch((error) => {
        console.error("[auth-link] failed to read initial URL", {
          message: String(error),
        });
      });

    const sub = Linking.addEventListener("url", ({ url }) => {
      void processAuthCallbackUrl("listener", url);
    });

    return () => sub.remove();
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

  useEffect(() => {
    if (!initialized) return;
    if (!isMounted) return;

    if (!authSession) {
      if (inAuthGroup || inAuthCallback) return;
      if (rootSegment === undefined) return;

      router.replace("/login");
      return;
    }

    let isEffectActive = true;

    const checkOnboarding = async () => {
      if (inProtectedArea) return;
      const cached = await getCachedOnboardingCompleted(authSession.user.id);

      if (!isEffectActive) return;

      if (cached === false) {
        if (!inOnboardingGroup) router.replace("/(onboarding)/step-1");
        return;
      }

      if (cached === true) {
        if (!inOnboardingGroup) router.replace("/(tabs)");
        return;
      }
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", authSession.user.id)
        .single();

      if (!isEffectActive) return;

      if (error || !profile?.onboarding_completed) {
        await setCachedOnboardingCompleted(authSession.user.id, false);
        if (!inOnboardingGroup) router.replace("/(onboarding)/step-1");
        return;
      }

      await setCachedOnboardingCompleted(authSession.user.id, true);

      if (!inOnboardingGroup) {
        router.replace("/(tabs)");
      }
    };

    checkOnboarding();

    return () => {
      isEffectActive = false;
    };
  }, [
    initialized,
    isMounted,
    authSession,
    router,
    rootSegment,
    inAuthGroup,
    inOnboardingGroup,
    inProtectedArea,
    inAuthCallback,
  ]);

  if (!initialized && !inAuthCallback) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textMuted }}>Initializing session...</Text>
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
