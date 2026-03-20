import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch } from "@/store/hooks";
import { setSession } from "@/store/slices/authSlice";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

type CallbackStatus = "verifying" | "success" | "error";

const AuthCallbackScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const [status, setStatus] = useState<CallbackStatus>("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async (url: string) => {
      try {
        // Parse the deep link URL — could be:
        // fitnesstracker://auth/callback#access_token=...  (PKCE / magic link)
        // fitnesstracker://auth/callback?token=...&type=signup (email OTP verify)
        const parsed = Linking.parse(url);

        // ── 1. Fragment-based tokens (access_token + refresh_token) ──────────
        // Supabase sometimes puts these in the hash/fragment after an OAuth or
        // magic-link redirect. Expo Linking surfaces them in `parsed.queryParams`
        // when the URL has no real path fragment support.
        const params = parsed.queryParams ?? {};

        const accessToken =
          typeof params.access_token === "string" ? params.access_token : null;
        const refreshToken =
          typeof params.refresh_token === "string"
            ? params.refresh_token
            : null;

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          dispatch(
            setSession({
              user: data.session?.user ?? null,
              session: data.session,
            }),
          );
          setStatus("success");
          return;
        }

        // ── 2. OTP / email-verification token ────────────────────────────────
        // The email link looks like:
        //   https://<project>.supabase.co/auth/v1/verify?token=xxx&type=signup
        //     &redirect_to=fitnesstracker://auth/callback
        // Supabase redirects to the deep link and appends the same query params,
        // so we receive: fitnesstracker://auth/callback?token=xxx&type=signup
        const token = typeof params.token === "string" ? params.token : null;
        const type = typeof params.type === "string" ? params.type : "signup";

        if (token) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as any, // "signup" | "email" | "recovery" etc.
          });

          if (error) throw error;

          dispatch(
            setSession({
              user: data.session?.user ?? null,
              session: data.session,
            }),
          );
          setStatus("success");
          return;
        }

        // ── 3. Nothing usable in the URL ──────────────────────────────────────
        throw new Error(
          "Verification link is missing required parameters. Please request a new link.",
        );
      } catch (err: any) {
        console.error("[AuthCallback] error:", err);
        setErrorMessage(err?.message ?? "An unexpected error occurred.");
        setStatus("error");
      }
    };

    // Try to get the URL that launched / resumed the app
    const bootstrap = async () => {
      // getLinkingURL() returns the URL that opened the app from cold start
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleCallback(initialUrl);
        return;
      }

      // If app was already open, listen for the incoming deep link
      const sub = Linking.addEventListener("url", ({ url }) => {
        sub.remove();
        handleCallback(url);
      });

      // Timeout safety — if no URL arrives within 10 s, show an error
      const timeout = setTimeout(() => {
        sub.remove();
        setErrorMessage("Timed out waiting for the verification link.");
        setStatus("error");
      }, 10_000);

      return () => {
        clearTimeout(timeout);
        sub.remove();
      };
    };

    bootstrap();
  }, [dispatch]);

  // ── Navigation: once session is in Redux the _layout guard does the routing,
  //    but we give it a small nudge for the error path. ──────────────────────
  useEffect(() => {
    if (status === "error") {
      const t = setTimeout(() => router.replace("/"), 3000);
      return () => clearTimeout(t);
    }
  }, [status, router]);

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
        paddingHorizontal: 32,
        gap: 16,
      }}
    >
      {status === "verifying" && (
        <>
          <ActivityIndicator size="large" color={colors.text} />
          <Text
            style={{ color: colors.text, fontSize: 16 }}
            className="font-dmsans text-center"
          >
            Verifying your account…
          </Text>
        </>
      )}

      {status === "success" && (
        <>
          <Text
            style={{ color: colors.text, fontSize: 22 }}
            className="font-dmsans-bold text-center"
          >
            ✓ Email verified!
          </Text>
          <Text
            style={{ color: colors.textMuted, fontSize: 15 }}
            className="font-dmsans text-center"
          >
            Taking you to your dashboard…
          </Text>
        </>
      )}

      {status === "error" && (
        <>
          <Text
            style={{ color: colors.text, fontSize: 22 }}
            className="font-dmsans-bold text-center"
          >
            Verification failed
          </Text>
          <Text
            style={{ color: colors.textMuted, fontSize: 15 }}
            className="font-dmsans text-center"
          >
            {errorMessage}
          </Text>
          <Text
            style={{ color: colors.textMuted, fontSize: 13 }}
            className="font-dmsans text-center"
          >
            Redirecting you back…
          </Text>
        </>
      )}
    </View>
  );
};

export default AuthCallbackScreen;
