import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

interface ReminderProfile {
  id: string;
  expo_push_token: string | null;
  workout_reminders: boolean | null;
  meal_reminders: boolean | null;
  preferred_workout_time: "morning" | "afternoon" | "evening" | null;
}

type MealReminderType = "breakfast" | "lunch" | "dinner";

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

const shouldSendWorkoutReminder = (
  preferredTime: ReminderProfile["preferred_workout_time"],
  currentUtcHour: number,
): boolean => {
  if (!preferredTime) {
    return false;
  }

  if (preferredTime === "morning") {
    return currentUtcHour >= 6 && currentUtcHour <= 8;
  }

  if (preferredTime === "afternoon") {
    return currentUtcHour >= 12 && currentUtcHour <= 14;
  }

  return currentUtcHour >= 17 && currentUtcHour <= 19;
};

const getMealTypeForHour = (
  currentUtcHour: number,
): MealReminderType | null => {
  if (currentUtcHour === 7) {
    return "breakfast";
  }

  if (currentUtcHour === 12) {
    return "lunch";
  }

  if (currentUtcHour === 18) {
    return "dinner";
  }

  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!serviceRoleKey || !supabaseUrl) {
    console.error(
      "[reminders] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    return jsonResponse(500, { error: "Server configuration is incomplete." });
  }

  const authHeader = req.headers.get("Authorization");
  const expectedAuthHeader = `Bearer ${serviceRoleKey}`;

  if (!authHeader || authHeader !== expectedAuthHeader) {
    console.error("[reminders] unauthorized request");
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();
  const currentUtcHour = now.getUTCHours();
  const mealType = getMealTypeForHour(currentUtcHour);

  console.log("[reminders] schedule run start", {
    currentUtcHour,
    mealType,
    timestamp: now.toISOString(),
  });

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, expo_push_token, workout_reminders, meal_reminders, preferred_workout_time",
    )
    .or("workout_reminders.eq.true,meal_reminders.eq.true")
    .not("expo_push_token", "is", null)
    .eq("onboarding_completed", true);

  if (error) {
    console.error("[reminders] failed to fetch profiles", error);
    return jsonResponse(500, { error: error.message });
  }

  const profiles = (data ?? []) as ReminderProfile[];

  let sentCount = 0;

  const sendToProfile = async (
    token: string,
    title: string,
    body: string,
    extraData: Record<string, string>,
  ) => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-push-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          token,
          title,
          body,
          data: extraData,
        }),
      },
    );

    if (!response.ok) {
      const responseText = await response.text();
      console.error("[reminders] failed to send push", {
        status: response.status,
        responseText,
      });
      return;
    }

    sentCount += 1;
  };

  for (const profile of profiles) {
    const token = profile.expo_push_token;

    if (!token) {
      continue;
    }

    if (
      profile.workout_reminders &&
      shouldSendWorkoutReminder(profile.preferred_workout_time, currentUtcHour)
    ) {
      await sendToProfile(
        token,
        "Time to Work Out 💪",
        "Your workout is ready. Let's crush it today!",
        {
          screen: "/workout",
          type: "workout_reminder",
        },
      );
    }

    if (profile.meal_reminders && mealType) {
      await sendToProfile(
        token,
        "Meal Reminder 🥗",
        `Don't forget your ${mealType}!`,
        {
          screen: "/nutrition",
          type: "meal_reminder",
        },
      );
    }
  }

  console.log("[reminders] schedule run end", {
    profilesCount: profiles.length,
    sentCount,
  });

  return jsonResponse(200, {
    success: true,
    profilesProcessed: profiles.length,
    notificationsSent: sentCount,
    currentUtcHour,
  });
});
