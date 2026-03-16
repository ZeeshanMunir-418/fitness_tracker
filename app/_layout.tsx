import { supabase } from "@/lib/supabase";
import { store } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getSession, setSession } from "@/store/slices/authSlice";
import { DMSans_400Regular, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";
import { Provider } from "react-redux";
import "../globals.css";

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppNavigator() {
  const dispatch = useAppDispatch();
  const router = useRouter();
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
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .single();

      if (!isMounted) return;

      if (error || !profile?.onboarding_completed) {
        router.replace("/(onboarding)/step-1");
        return;
      }

      router.replace("/(tabs)");
    };

    checkOnboarding();

    return () => {
      isMounted = false;
    };
  }, [initialized, session, router]);

  if (!initialized) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator color="#000" size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="workout/[id]" options={{ headerShown: false }} />
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
      <StatusBar style="auto" />
    </Provider>
  );
}
