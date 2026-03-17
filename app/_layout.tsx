import { supabase } from "@/lib/supabase";
import { store } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getSession, setSession } from "@/store/slices/authSlice";
import { DMSans_400Regular, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import "react-native-reanimated";
import { Provider } from "react-redux";
import "../globals.css";

const onboardingCacheKey = (userId: string) =>
  `apex_onboarding_completed_${userId}`;

const getCachedOnboardingCompleted = (userId: string) => {
  try {
    const raw = globalThis.localStorage?.getItem(onboardingCacheKey(userId));
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  } catch {
    return null;
  }
};

const setCachedOnboardingCompleted = (userId: string, value: boolean) => {
  try {
    globalThis.localStorage?.setItem(onboardingCacheKey(userId), String(value));
  } catch {
    // Ignore cache write failures.
  }
};

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppNavigator() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const { session, initialized } = useAppSelector((s) => s.auth);

  useEffect(() => {
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

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);

  useEffect(() => {
    if (!initialized) return;
    if (!session) return;

    let isMounted = true;

    const checkOnboarding = async () => {
      const rootSegment = segments[0];
      const inAuthGroup = rootSegment === "(auth)";
      const inOnboardingGroup = rootSegment === "(onboarding)";
      const inTabsGroup = rootSegment === "(tabs)";
      const inLandingRoute = segments.length === 0 || rootSegment === "index";

      // Use cached onboarding state first to avoid blocking on network.
      const cachedOnboardingCompleted = getCachedOnboardingCompleted(
        session.user.id,
      );

      if (cachedOnboardingCompleted === false && !inOnboardingGroup) {
        router.replace("/(onboarding)/step-1");
      }

      if (
        cachedOnboardingCompleted === true &&
        !inTabsGroup &&
        (inAuthGroup || inOnboardingGroup || inLandingRoute)
      ) {
        router.replace("/(tabs)");
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .single();

      if (!isMounted) return;

      if (error || !profile?.onboarding_completed) {
        setCachedOnboardingCompleted(session.user.id, false);
        if (!inOnboardingGroup) {
          router.replace("/(onboarding)/step-1");
        }
        return;
      }

      setCachedOnboardingCompleted(session.user.id, true);

      // Only force tabs from gate routes. Do not override normal tab/stack navigation.
      if (
        !inTabsGroup &&
        (inAuthGroup || inOnboardingGroup || inLandingRoute)
      ) {
        router.replace("/(tabs)");
      }
    };

    checkOnboarding();

    return () => {
      isMounted = false;
    };
  }, [initialized, session, router, segments]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="(notifications)" options={{ headerShown: false }} />
      <Stack.Screen name="(profile)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="workout" options={{ headerShown: false }} />
      <Stack.Screen
        name="modal"
        options={{ presentation: "modal", title: "Modal" }}
      />
    </Stack>
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
      <AppNavigator />
      <StatusBar style="dark" />
    </Provider>
  );
}
