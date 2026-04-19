import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "npm:jose@5";

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

type NotificationStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "cancelled";

interface QueueRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  status: NotificationStatus;
  scheduled_for: string;
  process_after: string;
  attempts: number;
  max_attempts: number;
}

interface PushTokenRow {
  id: string;
  fcm_token: string;
}

interface FirebaseServiceAccount {
  project_id: string;
  private_key: string;
  client_email: string;
}

interface FCMResult {
  status: number;
  bodyText: string;
}

let cachedFCMAccessToken: string | null = null;
let cachedFCMAccessTokenExpiresAt = 0;

const parseServiceAccount = (): FirebaseServiceAccount => {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT secret.");
  }

  let parsed: Partial<FirebaseServiceAccount>;
  try {
    parsed = JSON.parse(raw) as Partial<FirebaseServiceAccount>;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
  }

  if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT must include project_id, private_key, and client_email.",
    );
  }

  return {
    project_id: parsed.project_id,
    private_key: parsed.private_key,
    client_email: parsed.client_email,
  };
};

async function getFCMAccessToken(
  serviceAccount: FirebaseServiceAccount,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedFCMAccessToken && cachedFCMAccessTokenExpiresAt > now + 60) {
    return cachedFCMAccessToken;
  }

  const normalizedPrivateKey = serviceAccount.private_key.replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(normalizedPrivateKey, "RS256");

  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(serviceAccount.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenBody = (await tokenResponse.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!tokenResponse.ok || !tokenBody.access_token) {
    throw new Error(
      tokenBody.error_description ??
        tokenBody.error ??
        "Failed to get FCM access token.",
    );
  }

  cachedFCMAccessToken = tokenBody.access_token;
  cachedFCMAccessTokenExpiresAt = now + (tokenBody.expires_in ?? 3600);

  return cachedFCMAccessToken;
}

const toStringDataPayload = (
  data: Record<string, unknown> | null,
): Record<string, string> => {
  if (!data) return {};

  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      output[key] = value;
      continue;
    }

    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      output[key] = String(value);
      continue;
    }

    output[key] = JSON.stringify(value);
  }

  return output;
};

const sendFCMMessage = async (
  serviceAccount: FirebaseServiceAccount,
  accessToken: string,
  token: string,
  row: QueueRow,
): Promise<FCMResult> => {
  const endpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

  const payload = {
    message: {
      token,
      notification: {
        title: row.title,
        body: row.body,
      },
      data: toStringDataPayload(row.data),
      android: {
        priority: "high",
        notification: {
          channel_id: "default",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  return {
    status: response.status,
    bodyText: await response.text(),
  };
};

const claimPendingRows = async (
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<QueueRow[]> => {
  const nowIso = new Date().toISOString();

  const { data: candidates, error: selectError } = await supabaseAdmin
    .from("notification_queue")
    .select(
      "id,user_id,type,title,body,data,status,scheduled_for,process_after,attempts,max_attempts",
    )
    .eq("status", "pending")
    .lte("process_after", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (!candidates || candidates.length === 0) {
    return [];
  }

  const candidateIds = candidates.map((row) => row.id);

  const { data: claimedRows, error: claimError } = await supabaseAdmin
    .from("notification_queue")
    .update({ status: "processing" })
    .in("id", candidateIds)
    .eq("status", "pending")
    .lte("process_after", nowIso)
    .select(
      "id,user_id,type,title,body,data,status,scheduled_for,process_after,attempts,max_attempts",
    );

  if (claimError) {
    throw new Error(claimError.message);
  }

  return (claimedRows ?? []) as QueueRow[];
};

const updateQueueRow = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("notification_queue")
    .update(patch)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};

const getActiveToken = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<PushTokenRow | null> => {
  const { data, error } = await supabaseAdmin
    .from("user_push_tokens")
    .select("id,fcm_token")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as PushTokenRow;
};

const markTokenInactive = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  tokenId: string,
): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("user_push_tokens")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", tokenId);

  if (error) {
    throw new Error(error.message);
  }
};

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
    console.error("[process-notification-queue] missing env vars");
    return jsonResponse(500, { error: "Server configuration is incomplete." });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    console.error("[process-notification-queue] unauthorized request");
    return jsonResponse(401, { error: "Unauthorized" });
  }

  let serviceAccount: FirebaseServiceAccount;
  try {
    serviceAccount = parseServiceAccount();
  } catch (error) {
    console.error(
      "[process-notification-queue] invalid firebase service account",
      error,
    );
    return jsonResponse(500, {
      error:
        error instanceof Error
          ? error.message
          : "Invalid FIREBASE_SERVICE_ACCOUNT.",
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let rows: QueueRow[] = [];
  try {
    rows = await claimPendingRows(supabaseAdmin);
  } catch (error) {
    console.error("[process-notification-queue] claim failed", error);
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Failed to claim rows.",
    });
  }

  if (rows.length === 0) {
    console.log("[process-notification-queue] no pending rows");
    return jsonResponse(200, {
      processed: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
    });
  }

  let accessToken = "";
  try {
    accessToken = await getFCMAccessToken(serviceAccount);
  } catch (error) {
    console.error(
      "[process-notification-queue] failed to get FCM access token",
      error,
    );

    for (const row of rows) {
      const attempts = row.attempts + 1;
      const shouldFail = attempts >= row.max_attempts;
      const retryMinutes = 5 * Math.max(1, Math.pow(2, attempts - 1));

      await updateQueueRow(supabaseAdmin, row.id, {
        status: shouldFail ? "failed" : "pending",
        attempts,
        process_after: new Date(
          Date.now() + retryMinutes * 60 * 1000,
        ).toISOString(),
        last_error:
          error instanceof Error
            ? error.message
            : "Failed to obtain FCM access token.",
      });
    }

    return jsonResponse(500, {
      processed: rows.length,
      sent: 0,
      failed: rows.length,
      cancelled: 0,
    });
  }

  let sent = 0;
  let failed = 0;
  let cancelled = 0;

  for (const row of rows) {
    try {
      const activeTokenRow = await getActiveToken(supabaseAdmin, row.user_id);

      if (!activeTokenRow) {
        await updateQueueRow(supabaseAdmin, row.id, {
          status: "cancelled",
          last_error: "No active FCM token found for user.",
        });
        cancelled += 1;
        continue;
      }

      const fcmResult = await sendFCMMessage(
        serviceAccount,
        accessToken,
        activeTokenRow.fcm_token,
        row,
      );

      if (fcmResult.status >= 200 && fcmResult.status < 300) {
        await updateQueueRow(supabaseAdmin, row.id, {
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
        });
        sent += 1;
        continue;
      }

      if (fcmResult.status >= 400 && fcmResult.status < 500) {
        await markTokenInactive(supabaseAdmin, activeTokenRow.id);
        await updateQueueRow(supabaseAdmin, row.id, {
          status: "failed",
          attempts: row.attempts + 1,
          last_error: `FCM ${fcmResult.status}: ${fcmResult.bodyText}`,
        });
        failed += 1;
        continue;
      }

      const attempts = row.attempts + 1;
      const shouldFail = attempts >= row.max_attempts;
      const retryMinutes = 5 * Math.max(1, Math.pow(2, attempts - 1));

      await updateQueueRow(supabaseAdmin, row.id, {
        status: shouldFail ? "failed" : "pending",
        attempts,
        process_after: new Date(
          Date.now() + retryMinutes * 60 * 1000,
        ).toISOString(),
        last_error: `FCM ${fcmResult.status}: ${fcmResult.bodyText}`,
      });

      failed += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      const shouldFail = attempts >= row.max_attempts;
      const retryMinutes = 5 * Math.max(1, Math.pow(2, attempts - 1));

      try {
        await updateQueueRow(supabaseAdmin, row.id, {
          status: shouldFail ? "failed" : "pending",
          attempts,
          process_after: new Date(
            Date.now() + retryMinutes * 60 * 1000,
          ).toISOString(),
          last_error:
            error instanceof Error
              ? error.message
              : "Network or worker error while sending notification.",
        });
      } catch (updateError) {
        console.error(
          "[process-notification-queue] failed to update row after error",
          {
            rowId: row.id,
            updateError,
          },
        );
      }

      failed += 1;
    }
  }

  console.log("[process-notification-queue] batch processed", {
    processed: rows.length,
    sent,
    failed,
    cancelled,
  });

  return jsonResponse(200, {
    processed: rows.length,
    sent,
    failed,
    cancelled,
  });
});
