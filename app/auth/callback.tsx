import { supabase } from "@/lib/supabase";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

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

export default function AuthCallback() {
  const [status, setStatus] = useState("Waiting for authentication link...");
  const [linkingUrl, setLinkingUrl] = useState<string>("");

  useEffect(() => {
    console.log("[auth/callback] mounted");

    const handleAuthUrl = async (
      source: "initial" | "listener",
      url: string,
    ) => {
      console.log("[auth/callback] received URL", { source, url });
      setLinkingUrl(url);
      setStatus("Processing authentication...");

      const parsed = Linking.parse(url);
      const query = parsed.queryParams ?? {};
      const fragment = getFragmentParams(url);

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
          console.error("[auth/callback] setSession failed", {
            source,
            message: error.message,
          });
          setStatus(`Auth setSession failed: ${error.message}`);
          return;
        }

        console.log("[auth/callback] setSession succeeded", { source });
        setStatus("Authentication completed. Redirecting...");
        return;
      }

      if (token) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as any,
        });

        if (error) {
          console.error("[auth/callback] verifyOtp failed", {
            source,
            message: error.message,
          });
          setStatus(`Auth verify failed: ${error.message}`);
          return;
        }

        console.log("[auth/callback] verifyOtp succeeded", { source });
        setStatus("Authentication completed. Redirecting...");
        return;
      }

      if (!code) {
        setStatus("No auth payload found in callback URL.");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(url);

      if (error) {
        const { data } = await supabase.auth.getSession();

        if (data.session) {
          console.log(
            "[auth/callback] exchange failed but session already exists",
            {
              source,
              message: error.message,
              userId: data.session.user.id,
            },
          );
          setStatus("Session is already active. Redirecting...");
          return;
        }

        console.error("[auth/callback] exchange failed", {
          source,
          message: error.message,
        });
        setStatus(`Auth exchange failed: ${error.message}`);
        return;
      }

      console.log("[auth/callback] exchange succeeded", { source });
      setStatus("Authentication completed. Redirecting...");
    };

    Linking.getInitialURL()
      .then((url) => {
        console.log("[auth/callback] initial URL", { url });

        if (!url) {
          setStatus(
            "No callback URL found yet. Waiting for deep link event...",
          );
          return;
        }

        void handleAuthUrl("initial", url);
      })
      .catch((error) => {
        console.error("[auth/callback] failed to read initial URL", {
          message: String(error),
        });
        setStatus("Unable to read callback URL.");
      });

    const sub = Linking.addEventListener("url", ({ url }) => {
      void handleAuthUrl("listener", url);
    });

    return () => {
      sub.remove();
      console.log("[auth/callback] unmounted");
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "600", textAlign: "center" }}>
        Processing authentication
      </Text>
      <Text style={{ marginTop: 12, textAlign: "center" }}>{status}</Text>
      {linkingUrl ? (
        <Text style={{ marginTop: 12, textAlign: "center", fontSize: 12 }}>
          URL: {linkingUrl}
        </Text>
      ) : null}
    </View>
  );
}
