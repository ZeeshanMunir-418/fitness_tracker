import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXERCISEDB_BASE = "https://oss.exercisedb.dev/api/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface ExerciseDbExercise {
  exerciseId: string;
  name: string;
  gifUrl: string;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

interface UserProfile {
  id: string;
  primary_goal: string;
  activity_level: string;
  preferred_workout_type: string;
  workout_duration: string;
  workout_days_per_week: number;
  age: number;
  gender: string;
  current_weight: number;
  weight_unit: string;
  height: number;
  height_unit: string;
}

interface PlannedExercise {
  exerciseDbId: string;
  name: string;
  gifUrl: string;
  sets: number;
  reps: string;
  restSeconds: number;
  muscleGroup: string;
  instructions: string;
}

interface WorkoutDay {
  dayName: string;
  dayNumber: number;
  title: string;
  description: string;
  durationMinutes: number;
  isRestDay: boolean;
  exercises: PlannedExercise[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// ExerciseDB valid bodyPart values (from actual API):
// back | cardio | chest | lower arms | lower legs | neck | shoulders | upper arms | upper legs | waist

const HOME_EQUIPMENT = ["body weight", "resistance band", "dumbbell", "band"];
const GYM_EQUIPMENT = [
  "barbell",
  "cable",
  "dumbbell",
  "machine",
  "kettlebell",
  "ez barbell",
  "smith machine",
  "trap bar",
];

// ── Weekly split builder ───────────────────────────────────────────────────────

interface DayConfig {
  title: string;
  description: string;
  bodyParts: string[];
}

const buildWeeklySplit = (daysPerWeek: number, goal: string): DayConfig[] => {
  const ppl: DayConfig[] = [
    {
      title: "Push Day — Chest & Shoulders",
      description:
        "Compound pressing movements targeting chest, shoulders, and triceps.",
      bodyParts: ["chest", "shoulders", "upper arms"],
    },
    {
      title: "Pull Day — Back & Biceps",
      description: "Pulling movements for a wide back and strong biceps.",
      bodyParts: ["back", "upper arms"],
    },
    {
      title: "Leg Day — Quads, Hamstrings & Glutes",
      description: "Full lower body session for strength and hypertrophy.",
      bodyParts: ["upper legs", "lower legs"],
    },
    {
      title: "Upper Body — Shoulders & Arms",
      description: "Isolation work for shoulders, biceps, and triceps.",
      bodyParts: ["shoulders", "upper arms"],
    },
    {
      title: "Lower Body & Core",
      description: "Leg strength combined with core stability work.",
      bodyParts: ["upper legs", "waist"],
    },
    {
      title: "Full Body Power",
      description: "Compound movements hitting every major muscle group.",
      bodyParts: ["chest", "back", "upper legs"],
    },
  ];

  const endurance: DayConfig[] = [
    {
      title: "Cardio & Core",
      description: "Steady-state cardio paired with core stability work.",
      bodyParts: ["cardio", "waist"],
    },
    {
      title: "Upper Body Endurance",
      description: "High-rep upper body circuit to build muscular endurance.",
      bodyParts: ["chest", "back", "shoulders"],
    },
    {
      title: "Lower Body Endurance",
      description:
        "High-rep leg circuit with minimal rest for aerobic conditioning.",
      bodyParts: ["upper legs", "lower legs"],
    },
    {
      title: "Full Body Circuit",
      description:
        "Full body circuit training to improve cardiovascular fitness.",
      bodyParts: ["chest", "upper legs", "waist"],
    },
    {
      title: "Active Recovery & Mobility",
      description: "Low intensity movement and flexibility work.",
      bodyParts: ["back", "waist"],
    },
    {
      title: "HIIT & Power",
      description: "High-intensity intervals targeting the full body.",
      bodyParts: ["cardio", "upper legs", "chest"],
    },
  ];

  const template = goal === "improve_endurance" ? endurance : ppl;
  const clampedDays = Math.min(Math.max(daysPerWeek, 1), 6);

  const activeDays: DayConfig[] = [];
  for (let i = 0; i < clampedDays; i++) {
    activeDays.push(template[i % template.length]);
  }
  return activeDays;
};

// ── ExerciseDB fetcher ─────────────────────────────────────────────────────────

const fetchByBodyPart = async (
  bodyPart: string,
): Promise<ExerciseDbExercise[]> => {
  try {
    const res = await fetch(
      `${EXERCISEDB_BASE}/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=100`,
    );
    if (!res.ok) {
      console.warn(
        `[fn] ExerciseDB returned ${res.status} for bodyPart: ${bodyPart}`,
      );
      return [];
    }
    const json = await res.json();
    return Array.isArray(json) ? json : (json.data ?? []);
  } catch (e) {
    console.warn(`[fn] fetch failed for bodyPart ${bodyPart}:`, e);
    return [];
  }
};

const fetchExercisePool = async (
  bodyParts: string[],
  planType: "home" | "gym",
): Promise<Map<string, ExerciseDbExercise[]>> => {
  const unique = [...new Set(bodyParts)];
  const allowed = planType === "home" ? HOME_EQUIPMENT : GYM_EQUIPMENT;

  const results = await Promise.all(
    unique.map(async (part) => {
      const exercises = await fetchByBodyPart(part);
      const filtered = exercises.filter((e) =>
        e.equipments.some((eq) => allowed.includes(eq.toLowerCase())),
      );
      console.log(
        `[fn] ${planType} pool — ${part}: ${filtered.length} exercises`,
      );
      return [part, filtered] as [string, ExerciseDbExercise[]];
    }),
  );

  return new Map(results);
};
interface Prescription {
  sets: number;
  reps: string;
  restSeconds: number;
}

const getPrescription = (goal: string, activityLevel: string): Prescription => {
  const isAdvanced = ["very_active", "athlete"].includes(activityLevel);

  const map: Record<string, Prescription> = {
    lose_weight: { sets: 3, reps: "15-20", restSeconds: 45 },
    build_muscle: {
      sets: isAdvanced ? 5 : 4,
      reps: isAdvanced ? "6-10" : "8-12",
      restSeconds: 90,
    },
    improve_endurance: { sets: 3, reps: "20-25", restSeconds: 30 },
    improve_flexibility: { sets: 2, reps: "30 sec hold", restSeconds: 30 },
    maintain_weight: { sets: 3, reps: "12-15", restSeconds: 60 },
  };

  return map[goal] ?? { sets: 3, reps: "12-15", restSeconds: 60 };
};

const getExerciseCount = (duration: string): number =>
  ({ "15_30": 4, "30_45": 5, "45_60": 6, "60_plus": 7 })[duration] ?? 5;

const getDurationMinutes = (duration: string): number =>
  ({ "15_30": 25, "30_45": 37, "45_60": 50, "60_plus": 65 })[duration] ?? 45;

// Deterministic per-day shuffle so each day gets different exercises
const seededShuffle = <T>(arr: T[], seed: number): T[] => {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const pickExercises = (
  pool: Map<string, ExerciseDbExercise[]>,
  bodyParts: string[],
  count: number,
  dayNumber: number,
  prescription: Prescription,
): PlannedExercise[] => {
  // Gather candidates from all relevant body parts for this day
  const candidates: ExerciseDbExercise[] = [];
  for (const part of bodyParts) {
    candidates.push(...(pool.get(part) ?? []));
  }

  // Deduplicate by exerciseId
  const seen = new Set<string>();
  const unique = candidates.filter((e) => {
    if (seen.has(e.exerciseId)) return false;
    seen.add(e.exerciseId);
    return true;
  });

  // Shuffle differently per day, then take what we need
  const shuffled = seededShuffle(unique, dayNumber * 31337);
  const picked = shuffled.slice(0, count);

  return picked.map((e) => ({
    exerciseDbId: e.exerciseId,
    name: e.name,
    gifUrl: e.gifUrl,
    sets: prescription.sets,
    reps: prescription.reps,
    restSeconds: prescription.restSeconds,
    muscleGroup: e.targetMuscles[0] ?? e.bodyParts[0] ?? "General",
    instructions: e.instructions.join(" "),
  }));
};

const buildPlan = (
  profile: UserProfile,
  pool: Map<string, ExerciseDbExercise[]>,
  activeDays: DayConfig[],
): WorkoutDay[] => {
  const prescription = getPrescription(
    profile.primary_goal,
    profile.activity_level,
  );
  const exerciseCount = getExerciseCount(profile.workout_duration);
  const duration = getDurationMinutes(profile.workout_duration);

  const schedule = Array(7).fill(false) as boolean[];
  if (activeDays.length >= 7) {
    schedule.fill(true);
  } else {
    const step = 7 / activeDays.length;
    for (let i = 0; i < activeDays.length; i++) {
      schedule[Math.round(i * step) % 7] = true;
    }
  }

  let activeIndex = 0;
  return Array.from({ length: 7 }, (_, i) => {
    const dayName = DAY_NAMES[i];
    const dayNumber = i + 1;
    const isActive = schedule[i] && activeIndex < activeDays.length;

    if (isActive) {
      const config = activeDays[activeIndex++];
      const exercises = pickExercises(
        pool,
        config.bodyParts,
        exerciseCount,
        dayNumber,
        prescription,
      );

      return {
        dayName,
        dayNumber,
        title: config.title,
        description: config.description,
        durationMinutes: duration,
        isRestDay: false,
        exercises,
      };
    }

    return {
      dayName,
      dayNumber,
      title: "Rest & Recovery",
      description:
        "Allow your muscles to recover and grow. Light stretching or a walk is encouraged.",
      durationMinutes: 0,
      isRestDay: true,
      exercises: [],
    };
  });
};

// ── Auth ───────────────────────────────────────────────────────────────────────

const extractUserId = (token: string): string => {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Not a JWT");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const payload = JSON.parse(atob(padded));
  if (!payload.sub) throw new Error("No sub claim in token");
  return payload.sub;
};

// ── DB helpers ─────────────────────────────────────────────────────────────────

const mapWorkoutDays = (planId: string, days: WorkoutDay[]) =>
  days.map((day) => ({
    workout_plan_id: planId,
    day_name: day.dayName,
    day_number: day.dayNumber,
    title: day.title,
    description: day.description,
    duration_minutes: day.durationMinutes,
    exercises_count: day.exercises.length,
    is_rest_day: day.isRestDay,
    exercises: day.exercises,
  }));

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[fn] request received");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const userId = extractUserId(token);
    console.log("[fn] userId:", userId);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const profile: UserProfile = await req.json();
    console.log(
      "[fn] goal:",
      profile.primary_goal,
      "| days/week:",
      profile.workout_days_per_week,
    );

    // ── Build split & fetch pools ──────────────────────────────────────────
    const activeDays = buildWeeklySplit(
      profile.workout_days_per_week ?? 3,
      profile.primary_goal,
    );
    const allBodyParts = [...new Set(activeDays.flatMap((d) => d.bodyParts))];
    console.log("[fn] fetching body parts:", allBodyParts);

    const [homePool, gymPool] = await Promise.all([
      fetchExercisePool(allBodyParts, "home"),
      fetchExercisePool(allBodyParts, "gym"),
    ]);

    // ── Build plans ────────────────────────────────────────────────────────
    const homePlan = buildPlan(profile, homePool, activeDays);
    const gymPlan = buildPlan(profile, gymPool, activeDays);
    console.log(
      "[fn] plans built — home:",
      homePlan.length,
      "days | gym:",
      gymPlan.length,
      "days",
    );

    // ── Clear existing plans ───────────────────────────────────────────────
    const { data: existing } = await supabase
      .from("workout_plans")
      .select("id")
      .eq("user_id", userId);

    if (existing?.length) {
      const ids = existing.map((p: { id: string }) => p.id);
      await supabase
        .from("workout_plan_days")
        .delete()
        .in("workout_plan_id", ids);
      await supabase.from("workout_plans").delete().eq("user_id", userId);
      console.log("[fn] cleared", ids.length, "old plan(s)");
    }

    // ── Insert plans & days ────────────────────────────────────────────────
    console.log("[fn] inserting plans...");

    const [homeWorkoutPlan, gymWorkoutPlan] = await Promise.all([
      supabase
        .from("workout_plans")
        .insert({ user_id: userId, is_active: true, plan_type: "home" })
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) throw new Error(`Home plan: ${error.message}`);
          return data;
        }),
      supabase
        .from("workout_plans")
        .insert({ user_id: userId, is_active: true, plan_type: "gym" })
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) throw new Error(`Gym plan: ${error.message}`);
          return data;
        }),
    ]);

    await Promise.all([
      supabase
        .from("workout_plan_days")
        .insert(mapWorkoutDays(homeWorkoutPlan.id, homePlan))
        .then(({ error }) => {
          if (error) throw new Error(`Home days: ${error.message}`);
        }),
      supabase
        .from("workout_plan_days")
        .insert(mapWorkoutDays(gymWorkoutPlan.id, gymPlan))
        .then(({ error }) => {
          if (error) throw new Error(`Gym days: ${error.message}`);
        }),
    ]);

    console.log("[fn] days inserted");

    // ── Mark onboarding complete ───────────────────────────────────────────
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId);
    if (profileError)
      throw new Error(`Profile update: ${profileError.message}`);

    console.log("[fn] done ✓");

    return new Response(
      JSON.stringify({
        success: true,
        homeWorkoutPlanId: homeWorkoutPlan.id,
        gymWorkoutPlanId: gymWorkoutPlan.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[fn] error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
