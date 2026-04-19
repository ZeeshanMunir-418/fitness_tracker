import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type PlatformType = "android" | "ios";

interface RegisterPushTokenBody {
  fcm_token?: string;
  platform?: PlatformType;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[register-push-token] missing env vars");
    return jsonResponse(500, { error: "Server configuration is incomplete." });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    console.error("[register-push-token] missing bearer token");
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const accessToken = authHeader.slice("Bearer ".length).trim();
  if (!accessToken) {
    console.error("[register-push-token] empty bearer token");
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !userData.user) {
    console.error("[register-push-token] auth getUser failed", userError);
    return jsonResponse(401, { error: "Unauthorized" });
  }

  let body: RegisterPushTokenBody;
  try {
    body = (await req.json()) as RegisterPushTokenBody;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const fcmToken =
    typeof body.fcm_token === "string" ? body.fcm_token.trim() : "";
  const platform = body.platform;

  if (!fcmToken) {
    return jsonResponse(400, { error: "fcm_token is required." });
  }

  if (platform !== "android" && platform !== "ios") {
    return jsonResponse(400, { error: "platform must be 'android' or 'ios'." });
  }

  const userId = userData.user.id;
  const nowIso = new Date().toISOString();

  const { error: upsertError } = await supabaseAdmin
    .from("user_push_tokens")
    .upsert(
      {
        user_id: userId,
        fcm_token: fcmToken,
        platform,
        is_active: true,
        updated_at: nowIso,
      },
      { onConflict: "user_id,fcm_token" },
    );

  if (upsertError) {
    console.error("[register-push-token] upsert failed", upsertError);
    return jsonResponse(500, { error: upsertError.message });
  }

  const { error: deactivateError } = await supabaseAdmin
    .from("user_push_tokens")
    .update({ is_active: false, updated_at: nowIso })
    .eq("user_id", userId)
    .neq("fcm_token", fcmToken);

  if (deactivateError) {
    console.error(
      "[register-push-token] deactivate other tokens failed",
      deactivateError,
    );
    return jsonResponse(500, { error: deactivateError.message });
  }

  console.log("[register-push-token] token registered", {
    userId,
    platform,
  });

  return jsonResponse(200, { success: true });
});
