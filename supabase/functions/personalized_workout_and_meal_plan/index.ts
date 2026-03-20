import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey"
};
// ── Auth helpers ───────────────────────────────────────────────────────────────
const extractUserId = (token)=>{
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Not a JWT");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const payload = JSON.parse(atob(padded));
  if (!payload.sub) throw new Error("No sub claim in token");
  return payload.sub;
};
// ── OpenAI call ────────────────────────────────────────────────────────────────
const callOpenAI = async (systemPrompt, userPrompt)=>{
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.6,
      max_tokens: 6000,
      response_format: {
        type: "json_object"
      }
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI: ${data.error?.message ?? "error"}`);
  const text = data.choices?.[0]?.message?.content ?? "";
  return JSON.parse(text);
};
// ── Parallel: 3 separate focused prompts instead of 1 huge one ────────────────
// This is the key speed improvement — splitting into 3 concurrent requests
// each with a smaller token budget runs ~3x faster than one monolithic call.
const buildWorkoutPrompt = (p)=>`
You are an elite certified personal trainer (NSCA-CPT, CSCS).
Return ONLY valid JSON matching this exact shape — no markdown, no explanation.

{
  "homeWorkoutPlan": [ ...7 days ],
  "gymWorkoutPlan":  [ ...7 days ]
}

Each day object:
{
  "dayName": "Monday",
  "dayNumber": 1,
  "title": "Upper Body Strength",
  "description": "Focus on chest, shoulders and triceps using compound movements.",
  "durationMinutes": 45,
  "isRestDay": false,
  "exercises": [
    {
      "name": "Push-Up",
      "sets": 4,
      "reps": "12-15",
      "restSeconds": 60,
      "muscleGroup": "Chest",
      "instructions": "Keep core tight, lower chest to 2cm from floor, press back up explosively."
    }
  ]
}

Rules:
- Exactly 7 days for BOTH plans. dayNumber 1-7 sequential.
- Rest days: isRestDay=true, durationMinutes=0, title="Rest Day", exercises=[].
- Active days: 5-8 exercises. Include warm-up and cooldown notes in instructions.
- HOME workouts: bodyweight, resistance bands, or dumbbells only. No machines.
- GYM workouts: barbells, cables, machines, free weights. Include machine names.
- Match the user's goal (${p.primary_goal}), level (${p.activity_level}), and duration (${p.workout_duration} mins).
- Distribute muscle groups across the week — avoid training same group on consecutive days.
- Workout days per week: ${p.workout_days_per_week} — remaining days should be rest.
- reps can be a range string like "8-12" or "AMRAP" or "30 seconds".
- instructions must be detailed: form cues, breathing, tempo (e.g. "3-1-2"), common mistakes to avoid.

User profile:
- Goal: ${p.primary_goal}
- Activity level: ${p.activity_level}
- Preferred type: ${p.preferred_workout_type}
- Duration per session: ${p.workout_duration} mins
- Days per week: ${p.workout_days_per_week}
- Age: ${p.age}, Gender: ${p.gender}
- Weight: ${p.current_weight}${p.weight_unit}, Height: ${p.height}${p.height_unit}
`;
const buildMealPrompt = (p)=>`
You are a Registered Dietitian (RD) and precision nutrition coach.
Return ONLY valid JSON matching this exact shape — no markdown, no explanation.

{
  "mealPlan": {
    "breakfast": { "totalCalories": 520, "foodItems": [...] },
    "lunch":     { "totalCalories": 680, "foodItems": [...] },
    "dinner":    { "totalCalories": 650, "foodItems": [...] },
    "snacks":    { "totalCalories": 280, "foodItems": [...] }
  }
}

Each food item:
{
  "foodName": "Boiled Eggs (hard-boiled, 2 large)",
  "servingSize": "2 eggs (100g)",
  "calories": 155,
  "proteinGrams": 13.0,
  "carbsGrams": 1.1,
  "fatGrams": 11.0
}

STRICT RULES for food naming (this is the most important part):
- ALWAYS include cooking method in the food name: "Boiled", "Steamed", "Grilled", "Pan-fried", "Baked", "Poached", "Sautéed", "Air-fried", "Raw", "Roasted".
- ALWAYS include preparation detail: "Boiled Chicken Breast (skinless)", "Steamed Basmati Rice", "Grilled Salmon Fillet", "Baked Sweet Potato".
- ALWAYS include weight or count in servingSize: "150g", "1 cup (240ml)", "2 slices (60g)", "1 medium (130g)".
- Macros must be nutritionally accurate and consistent with the serving size.
- totalCalories for each meal = sum of all food item calories (must match exactly).

Meal composition rules:
- breakfast: 3-4 food items. Include a protein source, complex carb, and healthy fat.
- lunch: 4-5 food items. Largest meal. Include protein, carbs, vegetables, fat.
- dinner: 3-4 food items. Lighter than lunch. Lean protein + vegetables + small carb.
- snacks: 2-3 food items. High protein or nutrient dense. Good for pre/post workout.

Target totals:
- Daily calorie target: ${p.daily_calorie_target ?? 2000} kcal
- Distribution: breakfast 25%, lunch 35%, dinner 30%, snacks 10%.
- Dietary preference: ${p.dietary_preference} — strictly respect this constraint.
- Primary goal: ${p.primary_goal} — ${p.primary_goal === "build_muscle" ? "prioritize high protein (2g per kg bodyweight)" : p.primary_goal === "lose_weight" ? "high protein, high fiber, lower carbs" : "balanced macros"}.
- Weight: ${p.current_weight}${p.weight_unit}
- Activity level: ${p.activity_level}

Additional context:
- Halal: no pork, no alcohol in any ingredient.
- Vegan: strictly plant-based, no meat, fish, dairy, eggs, honey.
- Vegetarian: no meat or fish, dairy and eggs allowed.
- Keto: under 30g net carbs total for the day, high fat.
- High protein: minimum 40% calories from protein.
- No restriction: any whole foods are fine.
`;
// ── Map helpers ────────────────────────────────────────────────────────────────
const mapWorkoutDays = (planId, days)=>days.map((day)=>({
      workout_plan_id: planId,
      day_name: day.dayName,
      day_number: day.dayNumber,
      title: day.title,
      description: day.description,
      duration_minutes: day.durationMinutes,
      exercises_count: day.isRestDay ? 0 : day.exercises?.length ?? 0,
      is_rest_day: day.isRestDay,
      exercises: day.exercises ?? []
    }));
// ── Main handler ───────────────────────────────────────────────────────────────
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  console.log("[fn] request received");
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: "Missing Authorization header"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    const userId = extractUserId(token);
    console.log("[fn] userId:", userId);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const profile = await req.json();
    console.log("[fn] profile received");
    const systemPrompt = "You are a certified expert. Return ONLY valid JSON. No markdown. No explanation. No code blocks.";
    // ── 🚀 KEY SPEED FIX: run workout + meal calls in parallel ────────────────
    console.log("[fn] calling OpenAI (parallel: workout + meal)...");
    const [workoutPlan, mealPlanResult] = await Promise.all([
      callOpenAI(systemPrompt, buildWorkoutPrompt(profile)),
      callOpenAI(systemPrompt, buildMealPrompt(profile))
    ]);
    console.log("[fn] OpenAI done");
    console.log("[fn] home days:", workoutPlan.homeWorkoutPlan?.length);
    console.log("[fn] gym days:", workoutPlan.gymWorkoutPlan?.length);
    console.log("[fn] meal keys:", Object.keys(mealPlanResult.mealPlan ?? {}));
    // ── Save to DB (also parallelised where safe) ─────────────────────────────
    // Home + gym workout plan creation in parallel
    console.log("[fn] inserting workout plans...");
    const [homeWorkoutPlan, gymWorkoutPlan] = await Promise.all([
      supabase.from("workout_plans").insert({
        user_id: userId,
        is_active: true,
        plan_type: "home"
      }).select().single().then(({ data, error })=>{
        if (error) throw new Error(`Home plan: ${error.message}`);
        return data;
      }),
      supabase.from("workout_plans").insert({
        user_id: userId,
        is_active: true,
        plan_type: "gym"
      }).select().single().then(({ data, error })=>{
        if (error) throw new Error(`Gym plan: ${error.message}`);
        return data;
      })
    ]);
    console.log("[fn] plans created:", homeWorkoutPlan.id, gymWorkoutPlan.id);
    // Insert workout days in parallel
    console.log("[fn] inserting workout days...");
    await Promise.all([
      supabase.from("workout_plan_days").insert(mapWorkoutDays(homeWorkoutPlan.id, workoutPlan.homeWorkoutPlan)).then(({ error })=>{
        if (error) throw new Error(`Home days: ${error.message}`);
      }),
      supabase.from("workout_plan_days").insert(mapWorkoutDays(gymWorkoutPlan.id, workoutPlan.gymWorkoutPlan)).then(({ error })=>{
        if (error) throw new Error(`Gym days: ${error.message}`);
      })
    ]);
    console.log("[fn] workout days inserted");
    // Meal plan
    console.log("[fn] inserting meal plan...");
    const { data: mealPlan, error: mpError } = await supabase.from("meal_plans").insert({
      user_id: userId,
      is_active: true
    }).select().single();
    if (mpError) throw new Error(`Meal plan: ${mpError.message}`);
    const meals = mealPlanResult.mealPlan;
    const totalCals = Object.values(meals).reduce((sum, m)=>sum + (m.totalCalories ?? 0), 0);
    const { data: mealPlanDay, error: mpdError } = await supabase.from("meal_plan_days").insert({
      meal_plan_id: mealPlan.id,
      day_name: "Template",
      day_number: 1,
      total_calories: Math.round(totalCals)
    }).select().single();
    if (mpdError) throw new Error(`Meal plan day: ${mpdError.message}`);
    console.log("[fn] meal plan day:", mealPlanDay.id);
    // Insert all 4 meal types sequentially (each depends on its own row ID)
    for (const [mealType, mealData] of Object.entries(meals)){
      const { data: mealRow, error: mrError } = await supabase.from("meal_plan_meals").insert({
        meal_plan_day_id: mealPlanDay.id,
        meal_type: mealType,
        total_calories: Math.round(mealData.totalCalories ?? 0)
      }).select().single();
      if (mrError) throw new Error(`Meal (${mealType}): ${mrError.message}`);
      if (mealData.foodItems?.length > 0) {
        const foodItems = mealData.foodItems.map((item)=>({
            meal_plan_meal_id: mealRow.id,
            food_name: item.foodName,
            serving_size: item.servingSize,
            calories: item.calories,
            protein_grams: item.proteinGrams,
            carbs_grams: item.carbsGrams,
            fat_grams: item.fatGrams
          }));
        const { error: fiError } = await supabase.from("meal_plan_food_items").insert(foodItems);
        if (fiError) throw new Error(`Food items (${mealType}): ${fiError.message}`);
      }
    }
    console.log("[fn] meals saved");
    // Mark onboarding complete
    const { error: profileError } = await supabase.from("profiles").update({
      onboarding_completed: true
    }).eq("id", userId);
    if (profileError) throw new Error(`Profile update: ${profileError.message}`);
    console.log("[fn] done ✓");
    return new Response(JSON.stringify({
      success: true,
      homeWorkoutPlanId: homeWorkoutPlan.id,
      gymWorkoutPlanId: gymWorkoutPlan.id,
      mealPlanId: mealPlan.id
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("[fn] error:", err.message);
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
