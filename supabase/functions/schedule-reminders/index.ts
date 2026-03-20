import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SinglePayload {
  token?: string;
  userId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface BatchItem {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface BatchPayload {
  batch: BatchItem[];
}

type RequestPayload = SinglePayload | BatchPayload;

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: "default";
  priority: "high";
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const isValidExpoToken = (token: string): boolean =>
  token.startsWith("ExponentPushToken[");

// Expo recommends max 100 messages per batch request.
const EXPO_BATCH_SIZE = 100;

const chunkArray = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );

/**
 * Sends one batch of ≤100 Expo messages.
 * Returns the array of tickets from Expo.
 */
const sendExpoBatch = async (
  messages: ExpoMessage[],
): Promise<ExpoTicket[]> => {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  const json = await response.json();

  if (!response.ok) {
    console.error("[pushFn] Expo batch API failure", json);
    throw new Error(`Expo API error: ${JSON.stringify(json)}`);
  }

  // Expo wraps batch responses in { data: ExpoTicket[] }
  return (json.data ?? [json]) as ExpoTicket[];
};

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!serviceRoleKey || !supabaseUrl) {
    console.error("[pushFn] missing env vars");
    return jsonResponse(500, { error: "Server configuration is incomplete." });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    console.error("[pushFn] unauthorized request");
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  // ── BATCH mode ─────────────────────────────────────────────────────────────
  // Called by the reminders function with { batch: BatchItem[] }
  if ("batch" in payload) {
    const { batch } = payload;

    if (!Array.isArray(batch) || batch.length === 0) {
      return jsonResponse(400, { error: "batch must be a non-empty array." });
    }

    // Validate and build Expo messages, skipping bad tokens
    const messages: ExpoMessage[] = [];
    const skipped: string[] = [];

    for (const item of batch) {
      if (!item.token || !isValidExpoToken(item.token)) {
        skipped.push(item.token ?? "(missing)");
        continue;
      }
      if (!item.title || !item.body) {
        skipped.push(item.token);
        continue;
      }
      messages.push({
        to: item.token,
        title: item.title,
        body: item.body,
        data: item.data ?? {},
        sound: "default",
        priority: "high",
      });
    }

    if (messages.length === 0) {
      return jsonResponse(400, {
        error: "No valid messages in batch after validation.",
        skipped,
      });
    }

    // Split into ≤100 chunks and send concurrently
    const chunks = chunkArray(messages, EXPO_BATCH_SIZE);
    const allTickets: ExpoTicket[] = [];

    try {
      const chunkResults = await Promise.all(chunks.map(sendExpoBatch));
      chunkResults.forEach((tickets) => allTickets.push(...tickets));
    } catch (err) {
      console.error("[pushFn] batch send failed", err);
      return jsonResponse(502, {
        error: "Expo push API returned an error.",
        details: err instanceof Error ? err.message : String(err),
      });
    }

    const successCount = allTickets.filter((t) => t.status === "ok").length;
    const failedTickets = allTickets.filter((t) => t.status === "error");

    console.log("[pushFn] batch complete", {
      total: messages.length,
      sent: successCount,
      failed: failedTickets.length,
      skipped: skipped.length,
    });

    return jsonResponse(200, {
      success: true,
      total: messages.length,
      sent: successCount,
      failed: failedTickets.length,
      skipped: skipped.length,
      failedTickets, // surface Expo-level errors (DeviceNotRegistered etc.)
    });
  }

  // ── SINGLE mode ────────────────────────────────────────────────────────────
  // Original behaviour — single { token?, userId?, title, body, data? }

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
    return jsonResponse(400, {
      error: "Invalid Expo push token format.",
    });
  }

  const message: ExpoMessage = {
    to: resolvedToken,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: "default",
    priority: "high",
  };

  try {
    const [ticket] = await sendExpoBatch([message]);

    if (ticket.status === "error") {
      console.error("[pushFn] Expo ticket error", ticket);
      return jsonResponse(502, {
        error: "Expo rejected the notification.",
        details: ticket,
      });
    }

    console.log("[pushFn] notification sent", {
      token: resolvedToken,
      title: payload.title,
    });

    return jsonResponse(200, { success: true, ticket });
  } catch (err) {
    console.error("[pushFn] failed to call Expo push API", err);
    return jsonResponse(500, {
      error: "Failed to send notification via Expo push API.",
    });
  }
});
