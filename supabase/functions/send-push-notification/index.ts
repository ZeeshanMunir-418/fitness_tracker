import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

interface SendPushNotificationBody {
  userId?: string;
  token?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const isValidExpoToken = (token: string) =>
  token.startsWith("ExponentPushToken[");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!serviceRoleKey || !supabaseUrl) {
    console.error("[pushFn] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return jsonResponse(500, { error: "Server configuration is incomplete." });
  }

  const authHeader = req.headers.get("Authorization");
  const expectedAuthHeader = `Bearer ${serviceRoleKey}`;

  if (!authHeader || authHeader !== expectedAuthHeader) {
    console.error("[pushFn] unauthorized request");
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let payload: SendPushNotificationBody;

  try {
    payload = (await req.json()) as SendPushNotificationBody;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  if (!payload.title || !payload.body) {
    return jsonResponse(400, { error: "Both title and body are required." });
  }

  let resolvedToken = payload.token;

  if (!resolvedToken && payload.userId) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("expo_push_token")
      .eq("id", payload.userId)
      .maybeSingle();

    if (profileError) {
      console.error("[pushFn] failed to fetch user token", profileError);
      return jsonResponse(500, { error: profileError.message });
    }

    if (!profile) {
      return jsonResponse(404, { error: "User profile not found." });
    }

    resolvedToken = profile.expo_push_token ?? undefined;
  }

  if (!resolvedToken) {
    return jsonResponse(400, {
      error:
        "Missing push token. Provide token or a userId with a stored expo_push_token.",
    });
  }

  if (!isValidExpoToken(resolvedToken)) {
    return jsonResponse(400, { error: "Invalid Expo push token format." });
  }

  const expoPayload = {
    to: resolvedToken,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: "default",
    priority: "high",
  };

  try {
    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(expoPayload),
    });

    const expoResponseJson = (await expoResponse.json()) as unknown;

    if (!expoResponse.ok) {
      console.error("[pushFn] expo API failure", expoResponseJson);
      return jsonResponse(502, {
        error: "Expo push API returned an error.",
        details: expoResponseJson,
      });
    }

    console.log("[pushFn] notification sent", {
      token: resolvedToken,
      title: payload.title,
    });

    return jsonResponse(200, {
      success: true,
      expo: expoResponseJson,
    });
  } catch (error) {
    console.error("[pushFn] failed to call Expo push API", error);
    return jsonResponse(500, {
      error: "Failed to send notification via Expo push API.",
    });
  }
});
