import { AddMealModal } from "@/components/(tabs)/nutrition/add-meal-modal";
import { CalorieBanner } from "@/components/(tabs)/nutrition/calorie-banner";
import { MealCard } from "@/components/(tabs)/nutrition/meal-cards";
import { Progress } from "@/components/(tabs)/nutrition/progress";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useThemeStyles } from "@/lib/theme/useThemeStyles";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchMealsForDate,
  fetchTodayMeals,
  upsertDailyMeal,
  type DailyMeal,
  type MealType,
} from "@/store/slices/dailyMealSlice";
import { addFoodItem } from "@/store/slices/foodItemSlice";
import { fetchActiveMealPlan } from "@/store/slices/mealPlanSlice";
import type { FoodItem as SearchedFoodItem } from "@/store/slices/nutritionSlice";
import { fetchProfile } from "@/store/slices/profileSlice";
import {
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Plus,
  Sparkles,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Helpers ────────────────────────────────────────────────────────────────────
const toIsoDate = (date: Date) => date.toISOString().split("T")[0];

const formatDisplayDate = (date: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (toIsoDate(date) === toIsoDate(today)) {
    return `Today, ${date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
    })}`;
  }
  if (toIsoDate(date) === toIsoDate(yesterday)) {
    return `Yesterday, ${date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
    })}`;
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
};

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

type TabMode = "logged" | "plan";

// ── Screen ─────────────────────────────────────────────────────────────────────
const NutritionScreen = () => {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useThemeStyles();

  // ── Slices ─────────────────────────────────────────────────────────────────
  const {
    meals,
    todayCalories,
    loading: mealsLoading,
  } = useAppSelector((s) => s.dailyMeal);
  const { data: profile } = useAppSelector((s) => s.profile);
  const {
    plan: mealPlan,
    meals: planMeals,
    loading: planLoading,
  } = useAppSelector((s) => s.mealPlan);

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openModal, setOpenModal] = useState(false);
  const [openDropDown, setOpenDropDown] = useState<string | null>(null);
  const [showAllMeals, setShowAllMeals] = useState(false);
  const [tab, setTab] = useState<TabMode>("logged");
  const [savingMeal, setSavingMeal] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) dispatch(fetchProfile());
  }, [dispatch, profile]);

  useEffect(() => {
    const iso = toIsoDate(selectedDate);
    const todayIso = toIsoDate(new Date());
    if (iso === todayIso) {
      dispatch(fetchTodayMeals());
    } else {
      dispatch(fetchMealsForDate(iso));
    }
  }, [dispatch, selectedDate]);

  useEffect(() => {
    if (!mealPlan) {
      dispatch(fetchActiveMealPlan());
    }
  }, [dispatch, mealPlan]);

  // ── Date nav ───────────────────────────────────────────────────────────────
  const goToPrevDay = useCallback(() => {
    setSelectedDate((d) => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      return prev;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }, []);

  const isToday = toIsoDate(selectedDate) === toIsoDate(new Date());
  const loading = mealsLoading || planLoading;

  // ── Calorie goal ───────────────────────────────────────────────────────────
  const calorieGoal = profile?.daily_calorie_target ?? 2000;

  // ── Macros from logged meals ───────────────────────────────────────────────
  const macros = useMemo(() => {
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    meals.forEach((meal) => {
      meal.food_items?.forEach((item) => {
        protein += Number(item.protein_grams ?? 0);
        carbs += Number(item.carbs_grams ?? 0);
        fat += Number(item.fat_grams ?? 0);
      });
    });
    return { protein, carbs, fat };
  }, [meals]);

  const macroGoals = useMemo(
    () => ({
      carbs: Math.round((calorieGoal * 0.5) / 4),
      protein: Math.round((calorieGoal * 0.25) / 4),
      fat: Math.round((calorieGoal * 0.25) / 9),
    }),
    [calorieGoal],
  );

  const nutritionStats = [
    {
      label: "Carbs",
      intake: Math.round(macros.carbs),
      goal: macroGoals.carbs,
    },
    {
      label: "Protein",
      intake: Math.round(macros.protein),
      goal: macroGoals.protein,
    },
    {
      label: "Fats",
      intake: Math.round(macros.fat),
      goal: macroGoals.fat,
    },
  ];

  // ── Logged meals map ───────────────────────────────────────────────────────
  const mealsMap = useMemo(() => {
    const map: Partial<Record<MealType, DailyMeal>> = {};
    meals.forEach((meal) => {
      map[meal.meal_type] = meal;
    });
    return map;
  }, [meals]);

  // ── Plan meals map ─────────────────────────────────────────────────────────
  const planMealsMap = useMemo(() => {
    const map: Partial<
      Record<
        MealType,
        {
          totalCalories: number;
          foodItems: {
            foodName: string;
            calories: number;
            proteinGrams: number;
            carbsGrams: number;
            fatGrams: number;
            servingSize: string;
          }[];
        }
      >
    > = {};

    planMeals.forEach((meal) => {
      const items =
        meal.meal_plan_food_items?.map((item) => ({
          foodName: item.food_name,
          calories: Number(item.calories),
          proteinGrams: Number(item.protein_grams),
          carbsGrams: Number(item.carbs_grams),
          fatGrams: Number(item.fat_grams),
          servingSize: item.serving_size,
        })) ?? [];
      map[meal.meal_type as MealType] = {
        totalCalories: meal.total_calories,
        foodItems: items,
      };
    });

    return map;
  }, [planMeals]);

  // Total plan calories
  const planTotalCalories = useMemo(
    () => planMeals.reduce((sum, m) => sum + m.total_calories, 0),
    [planMeals],
  );

  // Visible meal keys for logged tab
  const visibleMealKeys = useMemo(() => {
    if (tab === "plan") return MEAL_ORDER;
    if (showAllMeals) return MEAL_ORDER;
    return MEAL_ORDER.filter(
      (key) => (mealsMap[key]?.food_items?.length ?? 0) > 0,
    );
  }, [mealsMap, showAllMeals, tab]);

  const hasAnyMeals = meals.length > 0;

  const handleSaveMeal = async (
    mealKey: MealType,
    items: SearchedFoodItem[],
  ) => {
    if (!items.length) {
      setOpenModal(false);
      return;
    }

    setSavingMeal(true);

    try {
      const incomingCalories = items.reduce(
        (sum, item) => sum + Number(item.calories ?? 0),
        0,
      );

      const existingMealCalories = mealsMap[mealKey]?.total_calories ?? 0;
      const newTotalCalories = existingMealCalories + incomingCalories;

      const meal = await dispatch(
        upsertDailyMeal({
          meal_type: mealKey,
          total_calories: newTotalCalories,
        }),
      ).unwrap();

      for (const item of items) {
        await dispatch(
          addFoodItem({
            daily_meal_id: meal.id,
            food_id: item.foodId,
            food_name: item.foodName,
            serving_size: item.servingSize,
            calories: Number(item.calories),
            protein_grams: Number(item.proteinGrams),
            carbs_grams: Number(item.carbsGrams),
            fat_grams: Number(item.fatGrams),
          }),
        ).unwrap();
      }

      const iso = toIsoDate(selectedDate);
      const todayIso = toIsoDate(new Date());

      if (iso === todayIso) {
        await dispatch(fetchTodayMeals()).unwrap();
      } else {
        await dispatch(fetchMealsForDate(iso)).unwrap();
      }

      setOpenModal(false);
    } catch (error) {
      console.error("[nutrition] save meal failed", error);
    } finally {
      setSavingMeal(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: 16,
          marginBottom: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.text} className="font-dmsans-bold text-2xl">
            Nutrition
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 4 }]}
            className="font-dmsans text-sm"
          >
            Track your meals and macros to stay on top of your nutrition goals.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setOpenModal(true)}
          disabled={savingMeal}
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.text,
            opacity: savingMeal ? 0.5 : 1,
          }}
        >
          <Plus size={20} color={colors.background} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {/* ── Date navigator ──────────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginHorizontal: 16,
          marginVertical: 8,
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: 999,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.card,
        }}
      >
        <TouchableOpacity onPress={goToPrevDay} hitSlop={8}>
          <ChevronLeft size={22} color={colors.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text
          style={{ color: colors.text }}
          className="font-dmsans-bold text-base"
        >
          {formatDisplayDate(selectedDate)}
        </Text>
        <TouchableOpacity onPress={goToNextDay} disabled={isToday} hitSlop={8}>
          <ChevronRight
            size={22}
            color={isToday ? colors.textFaint : colors.text}
            strokeWidth={1.5}
          />
        </TouchableOpacity>
      </View>

      {/* ── Tab toggle: Logged vs AI Plan ────────────────────────────────────── */}
      <View
        style={{
          flexDirection: "row",
          marginHorizontal: 16,
          marginVertical: 4,
          borderWidth: 2,
          borderColor: colors.borderMuted,
          borderRadius: 999,
          padding: 3,
          gap: 3,
        }}
      >
        {(
          [
            { value: "logged", label: "Logged", icon: ListChecks },
            { value: "plan", label: "AI Plan", icon: Sparkles },
          ] as const
        ).map(({ value, label, icon: Icon }) => {
          const active = tab === value;
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setTab(value)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: active ? colors.text : "transparent",
              }}
            >
              <Icon
                size={14}
                color={active ? colors.background : colors.textMuted}
                strokeWidth={1.8}
              />
              <Text
                style={{
                  color: active ? colors.background : colors.textMuted,
                  fontSize: 13,
                  fontFamily: "DMSans-Bold",
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <View
        style={{
          height: 2,
          marginHorizontal: 16,
          marginVertical: 8,
          backgroundColor: colors.cardBorder,
          borderRadius: 999,
        }}
      />

      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={colors.text} />
          <Text
            style={{ color: colors.textMuted, marginTop: 12 }}
            className="font-dmsans text-sm"
          >
            Loading nutrition data...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Calorie ring + macros ──────────────────────────────────────── */}
          <View style={{ marginBottom: 8 }}>
            <CalorieBanner goal={calorieGoal} intake={todayCalories} />
            <View style={{ gap: 16, marginTop: 8 }}>
              {nutritionStats.map((stat) => (
                <Progress
                  key={stat.label}
                  leftText={stat.label}
                  rightText={`${stat.intake}/${stat.goal}g`}
                  intake={stat.intake}
                  goal={stat.goal}
                />
              ))}
            </View>
          </View>

          {/* ── Section divider ───────────────────────────────────────────── */}
          <View
            style={{
              height: 2,
              backgroundColor: colors.cardBorder,
              borderRadius: 999,
              marginVertical: 20,
            }}
          />

          {/* ── Meals section ─────────────────────────────────────────────── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View>
              <Text
                style={{ color: colors.text }}
                className="font-dmsans-bold text-lg"
              >
                {tab === "logged" ? "Logged Meals" : "AI Meal Plan"}
              </Text>
              {tab === "plan" && mealPlan && (
                <Text
                  style={{
                    color: colors.textFaint,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                  className="font-dmsans"
                >
                  Template plan · {planTotalCalories} kcal total
                </Text>
              )}
            </View>

            {/* Only show toggle for logged tab */}
            {tab === "logged" && (
              <TouchableOpacity
                onPress={() => setShowAllMeals((v) => !v)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: colors.borderMuted,
                }}
              >
                <Text
                  style={{ color: colors.textMuted, fontSize: 12 }}
                  className="font-dmsans-bold"
                >
                  {showAllMeals ? "Logged only" : "Show all"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Logged tab content ─────────────────────────────────────────── */}
          {tab === "logged" && (
            <>
              {!hasAnyMeals && !showAllMeals ? (
                <View
                  style={{
                    borderWidth: 2,
                    borderColor: colors.cardBorder,
                    borderRadius: 20,
                    padding: 24,
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: colors.card,
                  }}
                >
                  <Text
                    style={{ color: colors.textMuted, fontSize: 14 }}
                    className="font-dmsans text-center"
                  >
                    No meals logged today.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAllMeals(true)}
                    style={{ marginTop: 4 }}
                  >
                    <Text
                      style={{ color: colors.text, fontSize: 13 }}
                      className="font-dmsans-bold"
                    >
                      Show all meal slots
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {visibleMealKeys.map((mealKey) => {
                    const meal = mealsMap[mealKey];
                    const mealName =
                      mealKey.charAt(0).toUpperCase() + mealKey.slice(1);
                    const isOpen = openDropDown === mealKey;
                    const foodItems =
                      meal?.food_items?.map((item) => ({
                        foodName: item.food_name,
                        calories: Number(item.calories),
                        fatGrams: Number(item.fat_grams),
                        proteinGrams: Number(item.protein_grams),
                        carbsGrams: Number(item.carbs_grams),
                        servingSize: item.serving_size,
                      })) ?? [];

                    return (
                      <MealCard
                        key={mealKey}
                        mealKey={mealKey}
                        openDropDown={isOpen}
                        setOpenDropDown={setOpenDropDown}
                        mealInitials={mealName.charAt(0)}
                        meal={mealName}
                        foodItems={foodItems}
                        totalCalories={meal?.total_calories ?? 0}
                      />
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ── AI Plan tab content ────────────────────────────────────────── */}
          {tab === "plan" && (
            <>
              {!mealPlan ? (
                <View
                  style={{
                    borderWidth: 2,
                    borderColor: colors.cardBorder,
                    borderRadius: 20,
                    padding: 24,
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: colors.card,
                  }}
                >
                  <Sparkles
                    size={28}
                    color={colors.textMuted}
                    strokeWidth={1.2}
                  />
                  <Text
                    style={{ color: colors.textMuted, fontSize: 14 }}
                    className="font-dmsans text-center"
                  >
                    No AI meal plan found.
                  </Text>
                  <Text
                    style={{ color: colors.textFaint, fontSize: 12 }}
                    className="font-dmsans text-center"
                  >
                    Complete onboarding to generate your personalized plan.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {MEAL_ORDER.map((mealKey) => {
                    const planMeal = planMealsMap[mealKey];
                    const mealName =
                      mealKey.charAt(0).toUpperCase() + mealKey.slice(1);
                    const isOpen = openDropDown === `plan_${mealKey}`;

                    return (
                      <MealCard
                        key={`plan_${mealKey}`}
                        mealKey={mealKey}
                        openDropDown={isOpen}
                        setOpenDropDown={(key) =>
                          setOpenDropDown(key ? `plan_${key}` : null)
                        }
                        mealInitials={mealName.charAt(0)}
                        meal={mealName}
                        foodItems={planMeal?.foodItems ?? []}
                        totalCalories={planMeal?.totalCalories ?? 0}
                      />
                    );
                  })}

                  {/* Plan info card */}
                  <View
                    style={{
                      borderWidth: 2,
                      borderColor: colors.cardBorder,
                      borderRadius: 16,
                      padding: 14,
                      backgroundColor: colors.card,
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{ color: colors.textMuted, fontSize: 12 }}
                      className="font-dmsans leading-5"
                    >
                      This is your AI-generated meal template. Log your actual
                      meals in the Logged tab to track real intake.
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      <AddMealModal
        visible={openModal}
        onClose={() => setOpenModal(false)}
        onSave={handleSaveMeal}
      />
    </SafeAreaView>
  );
};

export default NutritionScreen;
