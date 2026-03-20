import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── Types ─────────────────────────────────────────────────────────────────────

type PrimaryGoal =
  | "lose_weight"
  | "build_muscle"
  | "improve_endurance"
  | "improve_flexibility"
  | "maintain_weight";
type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "athlete";
type WorkoutType =
  | "strength_training"
  | "cardio"
  | "hiit"
  | "yoga_flexibility"
  | "mixed";
type WorkoutDuration = "15_30" | "30_45" | "45_60" | "60_plus";
type DietaryPreference =
  | "no_restriction"
  | "vegetarian"
  | "vegan"
  | "halal"
  | "keto"
  | "high_protein";
type PreferredWorkoutTime = "morning" | "afternoon" | "evening";
type MealType = "breakfast" | "lunch" | "dinner";

interface Profile {
  id: string;
  full_name: string | null;
  primary_goal: PrimaryGoal | null;
  activity_level: ActivityLevel | null;
  preferred_workout_type: WorkoutType | null;
  workout_duration: WorkoutDuration | null;
  workout_days_per_week: number | null;
  dietary_preference: DietaryPreference | null;
  tracks_calories: boolean | null;
  daily_calorie_target: number | null;
  preferred_workout_time: PreferredWorkoutTime | null;
  workout_reminders: boolean | null;
  meal_reminders: boolean | null;
  expo_push_token: string | null;
}

interface BatchItem {
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
}

interface NotificationContent {
  title: string;
  body: string;
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

const firstName = (fullName: string | null): string => {
  if (!fullName) return "";
  const name = fullName.trim().split(" ")[0];
  return name ? ` ${name}` : "";
};

const shouldSendWorkoutReminder = (
  preferredTime: PreferredWorkoutTime | null,
  currentUtcHour: number,
): boolean => {
  if (!preferredTime) return false;
  if (preferredTime === "morning")
    return currentUtcHour >= 6 && currentUtcHour <= 8;
  if (preferredTime === "afternoon")
    return currentUtcHour >= 12 && currentUtcHour <= 14;
  return currentUtcHour >= 17 && currentUtcHour <= 19;
};

const getMealTypeForHour = (currentUtcHour: number): MealType | null => {
  if (currentUtcHour === 7) return "breakfast";
  if (currentUtcHour === 12) return "lunch";
  if (currentUtcHour === 18) return "dinner";
  return null;
};

// ── Workout templates ─────────────────────────────────────────────────────────

const workoutTitles: Record<PrimaryGoal, string[]> = {
  lose_weight: [
    "Burn It Off 🔥",
    "Fat Burn Time 💨",
    "Calorie Crusher 🏃",
    "Sweat Session 💧",
  ],
  build_muscle: [
    "Time to Lift 💪",
    "Gains Are Waiting 🏋️",
    "Iron Time 🔩",
    "Build Mode On 💪",
  ],
  improve_endurance: [
    "Push Your Limits 🚀",
    "Endurance Session ⚡",
    "Go the Distance 🏅",
    "Cardio Time 🫀",
  ],
  improve_flexibility: [
    "Stretch & Flow 🧘",
    "Flexibility Session 🌿",
    "Mobility Time 🤸",
    "Loosen Up ✨",
  ],
  maintain_weight: [
    "Stay Consistent 🎯",
    "Keep It Up 🌟",
    "Workout Time 💫",
    "Active Day Ahead 🏃",
  ],
};

const buildWorkoutNotification = (profile: Profile): NotificationContent => {
  const name = firstName(profile.full_name);

  const durationLabel: Record<WorkoutDuration, string> = {
    "15_30": "15–30 min",
    "30_45": "30–45 min",
    "45_60": "45–60 min",
    "60_plus": "60+ min",
  };
  const durationSuffix = profile.workout_duration
    ? ` (${durationLabel[profile.workout_duration]})`
    : "";

  const workoutTypeLabel: Record<WorkoutType, string> = {
    strength_training: "strength training",
    cardio: "cardio",
    hiit: "HIIT",
    yoga_flexibility: "yoga & flexibility",
    mixed: "mixed training",
  };
  const workoutLabel = profile.preferred_workout_type
    ? workoutTypeLabel[profile.preferred_workout_type]
    : "workout";

  const activityBoost: Record<ActivityLevel, string> = {
    sedentary: "Every rep counts — let's go!",
    lightly_active: "Keep building that habit!",
    moderately_active: "You're on a roll — don't stop now!",
    very_active: "Another strong session awaits!",
    athlete: "Champions train even when they don't feel like it.",
  };
  const motivator = profile.activity_level
    ? activityBoost[profile.activity_level]
    : "Let's get moving!";

  const goalBodies: Record<PrimaryGoal, string[]> = {
    lose_weight: [
      `Hey${name}! Your ${workoutLabel} session${durationSuffix} is ready. Every calorie burned gets you closer. ${motivator}`,
      `Time for your ${workoutLabel}${durationSuffix},${name}! Consistency is the secret weapon. ${motivator}`,
      `Your fat-loss ${workoutLabel}${durationSuffix} is waiting${name ? ` for you, ${name.trim()}` : ""}. ${motivator}`,
    ],
    build_muscle: [
      `Hey${name}! ${workoutLabel}${durationSuffix} — muscles grow when you show up. ${motivator}`,
      `${name ? `${name.trim()}, your` : "Your"} ${workoutLabel}${durationSuffix} is locked in. Time to add plates. ${motivator}`,
      `Gains don't happen by accident${name}. Your ${workoutLabel}${durationSuffix} is ready. ${motivator}`,
    ],
    improve_endurance: [
      `Hey${name}! Your ${workoutLabel}${durationSuffix} is ready — stamina is built one session at a time. ${motivator}`,
      `${name ? `${name.trim()}, push` : "Push"} past yesterday with your ${workoutLabel}${durationSuffix}. ${motivator}`,
      `Endurance is your superpower${name}. ${workoutLabel}${durationSuffix} — let's go! ${motivator}`,
    ],
    improve_flexibility: [
      `Hey${name}! Your ${workoutLabel}${durationSuffix} awaits. A flexible body is a resilient body. ${motivator}`,
      `Time to move${name}! Your ${workoutLabel}${durationSuffix} is ready. ${motivator}`,
      `${name ? `${name.trim()}, your` : "Your"} ${workoutLabel}${durationSuffix} — breathe, stretch, and own it. ${motivator}`,
    ],
    maintain_weight: [
      `Hey${name}! Your ${workoutLabel}${durationSuffix} is ready. Staying consistent is the win. ${motivator}`,
      `Keep the momentum going${name} — ${workoutLabel}${durationSuffix} time! ${motivator}`,
      `Maintenance is a goal too${name}. ${workoutLabel}${durationSuffix} — let's do this. ${motivator}`,
    ],
  };

  const goal = profile.primary_goal ?? "maintain_weight";
  const dayIndex = new Date().getUTCDay();
  return {
    title: workoutTitles[goal][dayIndex % workoutTitles[goal].length],
    body: goalBodies[goal][dayIndex % goalBodies[goal].length],
  };
};

// ── Meal templates ────────────────────────────────────────────────────────────

const mealTitles: Record<MealType, string[]> = {
  breakfast: [
    "Rise & Fuel 🌅",
    "Breakfast Time ☀️",
    "Morning Fuel 🍳",
    "Start Strong 💪",
  ],
  lunch: [
    "Midday Fuel 🥗",
    "Lunch Break 🍱",
    "Refuel Time ⚡",
    "Power Lunch 🌿",
  ],
  dinner: [
    "Dinner Time 🍽️",
    "Evening Meal 🌙",
    "End Strong 🥘",
    "Recovery Fuel 🌟",
  ],
};

const buildMealNotification = (
  profile: Profile,
  mealType: MealType,
): NotificationContent => {
  const name = firstName(profile.full_name);

  const dietLabel: Record<DietaryPreference, string> = {
    no_restriction: "balanced",
    vegetarian: "vegetarian",
    vegan: "vegan",
    halal: "halal",
    keto: "keto",
    high_protein: "high-protein",
  };
  const dietDesc = profile.dietary_preference
    ? dietLabel[profile.dietary_preference]
    : "balanced";

  const calorieHint =
    profile.tracks_calories && profile.daily_calorie_target
      ? ` (${profile.daily_calorie_target} kcal target today)`
      : "";

  const goalMealHints: Record<PrimaryGoal, Record<MealType, string>> = {
    lose_weight: {
      breakfast: "Keep it light but filling — fuel for the day ahead.",
      lunch: "Choose a protein-rich, low-calorie option to stay on track.",
      dinner: "A light dinner tonight keeps tomorrow's progress intact.",
    },
    build_muscle: {
      breakfast: "Load up on protein to kick off muscle recovery.",
      lunch: "Fuel those muscles — plenty of protein and complex carbs.",
      dinner: "Your muscles repair overnight — feed them well.",
    },
    improve_endurance: {
      breakfast: "Complex carbs now = sustained energy all day.",
      lunch: "Carb up for your next training session.",
      dinner: "Replenish glycogen stores for tomorrow's endurance work.",
    },
    improve_flexibility: {
      breakfast: "Anti-inflammatory foods help your joints move freely.",
      lunch: "Stay hydrated and eat whole foods to support mobility.",
      dinner:
        "A nutrient-rich dinner supports muscle recovery and flexibility.",
    },
    maintain_weight: {
      breakfast: "A balanced breakfast sets the tone for the whole day.",
      lunch: "Keep your meals balanced and consistent.",
      dinner: "Finish the day with a satisfying, balanced meal.",
    },
  };

  const goal = profile.primary_goal ?? "maintain_weight";
  const goalHint = goalMealHints[goal][mealType];

  const bodies: Record<MealType, string[]> = {
    breakfast: [
      `Good morning${name}! Time for your ${dietDesc} breakfast${calorieHint}. ${goalHint}`,
      `Hey${name}, don't skip breakfast! Your ${dietDesc} meal${calorieHint} is due. ${goalHint}`,
      `Rise & eat${name}! A ${dietDesc} breakfast${calorieHint} powers your morning. ${goalHint}`,
    ],
    lunch: [
      `Hey${name}! Lunch time — your ${dietDesc} meal${calorieHint}. ${goalHint}`,
      `Midday check-in${name}: time for a ${dietDesc} lunch${calorieHint}. ${goalHint}`,
      `Fuel up${name}! Your ${dietDesc} lunch${calorieHint} keeps your energy up. ${goalHint}`,
    ],
    dinner: [
      `Dinner time${name}! A ${dietDesc} meal${calorieHint} to close the day. ${goalHint}`,
      `Hey${name}, evening meal time — keep it ${dietDesc}${calorieHint}. ${goalHint}`,
      `End your day well${name} — ${dietDesc} dinner${calorieHint}. ${goalHint}`,
    ],
  };

  const dayIndex = new Date().getUTCDay();
  return {
    title: mealTitles[mealType][dayIndex % mealTitles[mealType].length],
    body: bodies[mealType][dayIndex % bodies[mealType].length],
  };
};

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!serviceRoleKey || !supabaseUrl) {
    console.error("[reminders] missing env vars");
    return jsonResponse(500, { error: "Server configuration is incomplete." });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    console.error("[reminders] unauthorized request");
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const currentUtcHour = now.getUTCHours();
  const mealType = getMealTypeForHour(currentUtcHour);

  console.log("[reminders] run start", {
    currentUtcHour,
    mealType,
    timestamp: now.toISOString(),
  });

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(
      `id, full_name, expo_push_token, primary_goal, activity_level,
       preferred_workout_type, workout_duration, workout_days_per_week,
       dietary_preference, tracks_calories, daily_calorie_target,
       preferred_workout_time, workout_reminders, meal_reminders`,
    )
    .or("workout_reminders.eq.true,meal_reminders.eq.true")
    .not("expo_push_token", "is", null)
    .eq("onboarding_completed", true);

  if (error) {
    console.error("[reminders] failed to fetch profiles", error);
    return jsonResponse(500, { error: error.message });
  }

  const profiles = (data ?? []) as Profile[];

  // ── Build one flat batch instead of N individual HTTP calls ────────────────
  const batch: BatchItem[] = [];

  for (const profile of profiles) {
    const token = profile.expo_push_token;
    if (!token) continue;

    if (
      profile.workout_reminders &&
      shouldSendWorkoutReminder(profile.preferred_workout_time, currentUtcHour)
    ) {
      const { title, body } = buildWorkoutNotification(profile);
      batch.push({
        token,
        title,
        body,
        data: { screen: "/workout", type: "workout_reminder" },
      });
    }

    if (profile.meal_reminders && mealType) {
      const { title, body } = buildMealNotification(profile, mealType);
      batch.push({
        token,
        title,
        body,
        data: {
          screen: "/nutrition",
          type: "meal_reminder",
          meal_type: mealType,
        },
      });
    }
  }

  if (batch.length === 0) {
    console.log("[reminders] nothing to send this hour");
    return jsonResponse(200, {
      success: true,
      profilesProcessed: profiles.length,
      notificationsSent: 0,
      currentUtcHour,
    });
  }

  // ── One HTTP call to send-push-notification with the full batch ────────────
  const pushResponse = await fetch(
    `${supabaseUrl}/functions/v1/send-push-notification`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ batch }),
    },
  );

  const pushResult = await pushResponse.json();

  if (!pushResponse.ok) {
    console.error("[reminders] batch push failed", pushResult);
    return jsonResponse(502, {
      error: "Failed to deliver notification batch.",
      details: pushResult,
    });
  }

  console.log("[reminders] run end", {
    profilesCount: profiles.length,
    batchSize: batch.length,
    sent: pushResult.sent,
    failed: pushResult.failed,
    skipped: pushResult.skipped,
  });

  return jsonResponse(200, {
    success: true,
    profilesProcessed: profiles.length,
    notificationsSent: pushResult.sent ?? batch.length,
    failed: pushResult.failed ?? 0,
    currentUtcHour,
  });
});
