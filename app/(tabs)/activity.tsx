import { useWater } from "@/lib/hooks/useWater";
import { readStepsFromStorage } from "@/lib/stepCounter";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useThemeStyles } from "@/lib/theme/useThemeStyles";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  DailyMeal,
  fetchMealsForDate,
  fetchTodayMeals,
} from "@/store/slices/dailyMealSlice";
import { fetchProfile } from "@/store/slices/profileSlice";
import { fetchWorkoutLogs } from "@/store/slices/workoutLogSlice";
import {
  Activity,
  Apple,
  Clock,
  Coffee,
  Dumbbell,
  GlassWater,
  Moon,
  Sun,
  Utensils,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable as RNPressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Types ──────────────────────────────────────────────────────────────────────
type MealPeriod = "daily" | "weekly" | "monthly";

interface NutritionBarChartProps {
  meals: DailyMeal[];
  calorieGoal: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"] as const;

const MEAL_LABELS: Record<(typeof MEAL_TYPES)[number], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

const MEAL_ICONS: Record<
  string,
  React.ComponentType<{ size: number; color: string; strokeWidth: number }>
> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snacks: Apple,
};

const mealLabel = (value: (typeof MEAL_TYPES)[number]) =>
  value.charAt(0).toUpperCase() + value.slice(1);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const toIso = (d: Date) => d.toISOString().split("T")[0];

// ── Bar Chart ──────────────────────────────────────────────────────────────────
interface BarChartProps {
  data: { label: string; value: number }[];
  maxValue: number;
  highlightIndex?: number;
}

const BarChart = ({ data, maxValue, highlightIndex }: BarChartProps) => {
  const { colors } = useTheme();
  const BAR_HEIGHT = 120;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        height: BAR_HEIGHT + 32,
        paddingHorizontal: 4,
      }}
    >
      {data.map((item, index) => {
        const ratio = maxValue > 0 ? item.value / maxValue : 0;
        const barH = Math.max(4, Math.round(ratio * BAR_HEIGHT));
        const isHighlight = index === highlightIndex;

        return (
          <View
            key={index}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "flex-end",
              marginHorizontal: 2,
            }}
          >
            {item.value > 0 ? (
              <Text
                style={{
                  color: isHighlight ? colors.text : colors.textFaint,
                  fontSize: 9,
                  marginBottom: 3,
                  fontFamily: "DMSans-Bold",
                }}
              >
                {item.value >= 1000
                  ? `${(item.value / 1000).toFixed(1)}k`
                  : String(item.value)}
              </Text>
            ) : (
              <View style={{ height: 16 }} />
            )}
            <View
              style={{
                width: "100%",
                height: barH,
                borderRadius: 999,
                backgroundColor: isHighlight ? colors.text : colors.borderMuted,
              }}
            />
            <Text
              style={{
                color: isHighlight ? colors.text : colors.textFaint,
                fontSize: 10,
                marginTop: 6,
                fontFamily: isHighlight ? "DMSans-Bold" : "DMSans-Regular",
              }}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ── Nutrition Bar Chart ────────────────────────────────────────────────────────
const NutritionBarChart = ({ meals, calorieGoal }: NutritionBarChartProps) => {
  const { colors } = useTheme();
  const styles = useThemeStyles();
  const dispatch = useAppDispatch();

  const [period, setPeriod] = useState<MealPeriod>("daily");

  // Cache of { [isoDate]: totalCalories } for historical dates
  const [historicalCalories, setHistoricalCalories] = useState<
    Record<string, number>
  >({});
  const [histLoading, setHistLoading] = useState(false);

  const todayIso = toIso(new Date());
  const todayCalories = useMemo(
    () => meals.reduce((sum, m) => sum + Number(m.total_calories ?? 0), 0),
    [meals],
  );

  const PERIODS: { label: string; value: MealPeriod }[] = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
  ];

  // Returns all ISO dates needed for the current period (excluding today)
  const getRequiredDates = useCallback((): string[] => {
    const today = new Date();
    const dates: string[] = [];

    if (period === "weekly") {
      const dayIdx = today.getDay();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - (dayIdx - i));
        const iso = toIso(d);
        if (iso !== todayIso && d <= today) dates.push(iso);
      }
    } else if (period === "monthly") {
      for (let week = 0; week < 4; week++) {
        for (let day = 0; day < 7; day++) {
          const d = new Date(today);
          d.setDate(today.getDate() - (3 - week) * 7 - today.getDay() + day);
          const iso = toIso(d);
          if (iso !== todayIso && d <= today) dates.push(iso);
        }
      }
    }

    return [...new Set(dates)];
  }, [period, todayIso]);

  // Fetch missing historical dates when period changes
  useEffect(() => {
    if (period === "daily") return;

    const missing = getRequiredDates().filter(
      (iso) => historicalCalories[iso] === undefined,
    );
    if (!missing.length) return;

    setHistLoading(true);
    Promise.all(
      missing.map(async (iso) => {
        const result = await dispatch(fetchMealsForDate(iso)).unwrap();
        const total = result.meals.reduce(
          (sum, m) => sum + Number(m.total_calories ?? 0),
          0,
        );
        return { iso, total };
      }),
    )
      .then((entries) => {
        setHistoricalCalories((prev) => {
          const next = { ...prev };
          entries.forEach(({ iso, total }) => {
            next[iso] = total;
          });
          return next;
        });
      })
      .catch(console.error)
      .finally(() => setHistLoading(false));
  }, [period]);

  // Merged calories map including today
  const allCalories = useMemo(
    () => ({ ...historicalCalories, [todayIso]: todayCalories }),
    [historicalCalories, todayIso, todayCalories],
  );

  // ── Chart data per period ──────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const today = new Date();

    if (period === "daily") {
      const mealMap = new Map<string, number>();
      meals.forEach((m) => mealMap.set(m.meal_type, m.total_calories));
      return MEAL_TYPES.map((type) => ({
        label: MEAL_LABELS[type].slice(0, 5),
        value: mealMap.get(type) ?? 0,
      }));
    }

    if (period === "weekly") {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const todayDayIdx = today.getDay();
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (todayDayIdx - i));
        const iso = toIso(d);
        return {
          label: dayNames[i],
          value: i > todayDayIdx ? 0 : (allCalories[iso] ?? 0),
        };
      });
    }

    // monthly — last 4 weeks summed into W1–W4
    return Array.from({ length: 4 }, (_, weekIndex) => {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (3 - weekIndex) * 7 - today.getDay());
      let total = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + d);
        if (day > today) continue;
        total += allCalories[toIso(day)] ?? 0;
      }
      return { label: `W${weekIndex + 1}`, value: total };
    });
  }, [period, meals, allCalories]);

  // ── Highlight index ────────────────────────────────────────────────────────
  const highlightIndex = useMemo(() => {
    if (period === "daily") {
      const max = Math.max(...chartData.map((d) => d.value));
      return max > 0 ? chartData.findIndex((d) => d.value === max) : undefined;
    }
    if (period === "weekly") return new Date().getDay();
    return 3; // current (last) week column
  }, [period, chartData]);

  const maxValue = Math.max(...chartData.map((d) => d.value), 400);
  const isEmpty = chartData.every((d) => d.value === 0);

  // Hero value and label
  const heroValue = useMemo(() => {
    if (period === "daily") return todayCalories;
    if (period === "weekly") return chartData.reduce((s, d) => s + d.value, 0);
    return chartData[3]?.value ?? 0;
  }, [period, todayCalories, chartData]);

  const heroLabel =
    period === "daily"
      ? "Today"
      : period === "weekly"
        ? "This week"
        : "This week";

  const calorieProgress =
    calorieGoal > 0
      ? Math.min(
          1,
          period === "daily"
            ? todayCalories / calorieGoal
            : heroValue / (calorieGoal * 7),
        )
      : 0;

  return (
    <View style={{ marginBottom: 24 }}>
      {/* Section header + period pills */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Text style={styles.text} className="font-dmsans-bold text-base">
          Nutrition
        </Text>
        <View
          style={{
            flexDirection: "row",
            borderWidth: 2,
            borderColor: colors.borderMuted,
            borderRadius: 999,
            padding: 2,
            gap: 2,
          }}
        >
          {PERIODS.map((p) => {
            const active = period === p.value;
            return (
              <RNPressable
                key={p.value}
                onPress={() => setPeriod(p.value)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: active ? colors.text : "transparent",
                }}
              >
                <Text
                  style={{
                    color: active ? colors.background : colors.textMuted,
                    fontSize: 11,
                    fontFamily: "DMSans-Bold",
                  }}
                >
                  {p.label}
                </Text>
              </RNPressable>
            );
          })}
        </View>
      </View>

      <View
        style={[styles.card, { borderWidth: 2, borderRadius: 16, padding: 16 }]}
      >
        {/* Hero row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Utensils size={16} color={colors.text} strokeWidth={1.5} />
            <Text style={styles.text} className="font-dmsans-bold text-sm">
              {heroLabel}
            </Text>
          </View>
          <Text style={styles.text} className="font-dmsans-bold text-xl">
            {heroValue.toLocaleString()}
            <Text style={styles.textMuted} className="font-dmsans text-xs">
              {period === "daily"
                ? ` / ${calorieGoal > 0 ? calorieGoal.toLocaleString() : "--"} kcal`
                : " kcal"}
            </Text>
          </Text>
        </View>

        {/* Progress bar — daily only */}
        {period === "daily" && (
          <View
            style={{
              height: 6,
              borderRadius: 999,
              overflow: "hidden",
              backgroundColor: colors.cardBorder,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: `${Math.round(calorieProgress * 100)}%`,
                height: "100%",
                backgroundColor: colors.text,
                borderRadius: 999,
              }}
            />
          </View>
        )}

        {/* Spacer when no progress bar */}
        {period !== "daily" && <View style={{ height: 16 }} />}

        {/* Chart or loading */}
        {histLoading ? (
          <View
            style={{
              height: 152,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="small" color={colors.textMuted} />
          </View>
        ) : (
          <>
            <BarChart
              data={chartData}
              maxValue={maxValue}
              highlightIndex={highlightIndex}
            />
            {isEmpty && (
              <Text
                style={[
                  styles.textFaint,
                  { textAlign: "center", fontSize: 12, marginTop: 8 },
                ]}
                className="font-dmsans"
              >
                {period === "daily"
                  ? "Log a meal to see your nutrition breakdown"
                  : "No meals logged this period"}
              </Text>
            )}
          </>
        )}

        {/* Meal icon legend — daily only */}
        {period === "daily" && !isEmpty && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 16,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: colors.borderMuted,
            }}
          >
            {MEAL_TYPES.map((type) => {
              const MealIcon = MEAL_ICONS[type];
              const cals =
                chartData.find((d) => d.label === MEAL_LABELS[type].slice(0, 5))
                  ?.value ?? 0;
              return (
                <View
                  key={type}
                  style={{ alignItems: "center", flex: 1, gap: 4 }}
                >
                  <MealIcon
                    size={14}
                    color={cals > 0 ? colors.text : colors.textFaint}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={{
                      color: cals > 0 ? colors.textMuted : colors.textFaint,
                      fontSize: 9,
                      fontFamily: "DMSans-Regular",
                    }}
                  >
                    {cals > 0 ? `${cals} kcal` : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function ActivityScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useThemeStyles();
  const { goalMl, totalMlToday } = useWater();

  const { data: profile, loading: profileLoading } = useAppSelector(
    (s) => s.profile,
  );
  const {
    logs,
    loading: logsLoading,
    error: logsError,
  } = useAppSelector((s) => s.workoutLog);
  const {
    meals,
    todayCalories,
    loading: mealsLoading,
    error: mealsError,
  } = useAppSelector((s) => s.dailyMeal);

  const [todaySteps, setTodaySteps] = useState(0);

  useEffect(() => {
    readStepsFromStorage().then(setTodaySteps);
  }, []);

  useEffect(() => {
    if (!logs.length) void dispatch(fetchWorkoutLogs());
    if (!meals.length) void dispatch(fetchTodayMeals());
    if (!profile) void dispatch(fetchProfile());
  }, [dispatch, logs.length, meals.length, profile]);

  const loading = logsLoading || mealsLoading || profileLoading;

  const totalWorkouts = logs.length;

  const totalActiveMinutes = useMemo(
    () => logs.reduce((sum, item) => sum + item.duration_minutes, 0),
    [logs],
  );

  const workoutsThisWeek = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return logs.filter((item) => new Date(item.completed_at) >= oneWeekAgo)
      .length;
  }, [logs]);

  const calorieGoal = profile?.daily_calorie_target ?? 0;

  const mealMap = useMemo(() => {
    const map = new Map<string, { calories: number; count: number }>();
    meals.forEach((meal) => {
      map.set(meal.meal_type, {
        calories: meal.total_calories,
        count: meal.food_items?.length ?? 0,
      });
    });
    return map;
  }, [meals]);

  const recentLogs = logs.slice(0, 10);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={{ paddingTop: 16, marginBottom: 24 }}>
          <Text style={styles.text} className="font-dmsans-bold text-2xl">
            Activity
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 4 }]}
            className="font-dmsans text-sm"
          >
            Your daily training and nutrition snapshot
          </Text>
        </View>

        {/* ── Overview ────────────────────────────────────────────────────── */}
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.text} className="font-dmsans-bold text-base mb-3">
            Overview
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(
              [
                {
                  icon: Dumbbell,
                  value: totalWorkouts,
                  label: "Total\nworkouts",
                },
                {
                  icon: Clock,
                  value: totalActiveMinutes,
                  label: "Active\nminutes",
                },
                {
                  icon: Activity,
                  value: workoutsThisWeek,
                  label: "This\nweek",
                },
              ] as const
            ).map((item, index) => {
              const Icon = item.icon;
              return (
                <View
                  key={index}
                  style={[
                    styles.card,
                    { borderWidth: 2, borderRadius: 14, padding: 12, flex: 1 },
                  ]}
                >
                  <Icon size={16} color={colors.text} strokeWidth={1.5} />
                  <Text
                    style={[styles.text, { marginTop: 8 }]}
                    className="font-dmsans-bold text-lg"
                  >
                    {item.value}
                  </Text>
                  <Text
                    style={styles.textMuted}
                    className="font-dmsans text-xs"
                  >
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Nutrition Bar Chart ───────────────────────────────────────────── */}
        <NutritionBarChart meals={meals} calorieGoal={calorieGoal} />

        {/* ── Today's Nutrition ────────────────────────────────────────────── */}
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.text} className="font-dmsans-bold text-base mb-3">
            Today&apos;s Nutrition
          </Text>

          {/* Water goal */}
          <View
            style={[
              styles.card,
              {
                borderWidth: 2,
                borderRadius: 14,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
            ]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <GlassWater size={16} color={colors.text} strokeWidth={1.5} />
              <View>
                <Text style={styles.text} className="font-dmsans-bold text-sm">
                  Water Goal
                </Text>
                <Text style={styles.textMuted} className="font-dmsans text-xs">
                  Daily target
                </Text>
              </View>
            </View>
            <Text style={styles.text} className="font-dmsans-bold text-xl">
              {(totalMlToday / 1000).toFixed(2)}L/{(goalMl / 1000).toFixed(1)}L
            </Text>
          </View>

          {/* Meal breakdown */}
          <View style={{ marginTop: 8, gap: 8 }}>
            {meals.length === 0 ? (
              <View
                style={[
                  styles.card,
                  {
                    borderWidth: 2,
                    borderRadius: 14,
                    padding: 20,
                    alignItems: "center",
                    gap: 8,
                  },
                ]}
              >
                <Apple size={26} color={colors.textMuted} strokeWidth={1.5} />
                <Text style={styles.textMuted} className="font-dmsans text-sm">
                  No meals logged today
                </Text>
              </View>
            ) : (
              MEAL_TYPES.map((type) => {
                const item = mealMap.get(type);
                if (!item) return null;
                const MealIcon = MEAL_ICONS[type];
                return (
                  <View
                    key={type}
                    style={[
                      styles.card,
                      {
                        borderWidth: 2,
                        borderRadius: 14,
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 999,
                          backgroundColor: colors.text,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MealIcon
                          size={14}
                          color={colors.background}
                          strokeWidth={1.8}
                        />
                      </View>
                      <Text
                        style={styles.text}
                        className="font-dmsans-bold text-sm"
                      >
                        {mealLabel(type)}
                      </Text>
                    </View>
                    <Text
                      style={styles.textMuted}
                      className="font-dmsans text-xs"
                    >
                      {item.calories} kcal · {item.count} items
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* ── Body Stats ───────────────────────────────────────────────────── */}
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.text} className="font-dmsans-bold text-base mb-3">
            Body Stats
          </Text>
          <View
            style={[
              styles.card,
              { borderWidth: 2, borderRadius: 14, padding: 14 },
            ]}
          >
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {[
                {
                  label: "BMI",
                  value: profile?.bmi != null ? profile.bmi.toFixed(1) : "--",
                },
                {
                  label: "BMR",
                  value:
                    profile?.bmr != null ? `${Math.round(profile.bmr)}` : "--",
                },
              ].map((stat) => (
                <View
                  key={stat.label}
                  style={[
                    styles.input,
                    {
                      borderWidth: 2,
                      borderRadius: 12,
                      padding: 10,
                      flex: 1,
                    },
                  ]}
                >
                  <Text
                    style={styles.textMuted}
                    className="font-dmsans text-xs"
                  >
                    {stat.label}
                  </Text>
                  <Text
                    style={styles.text}
                    className="font-dmsans-bold text-lg mt-1"
                  >
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.textMuted} className="font-dmsans text-xs mb-2">
              Weight Progress
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={styles.text} className="font-dmsans-bold text-sm">
                {profile?.current_weight ?? "--"}
                {profile?.weight_unit ?? ""}
              </Text>
              <Text style={styles.textMuted} className="font-dmsans text-xs">
                Target: {profile?.target_weight ?? "--"}
                {profile?.weight_unit ?? ""}
              </Text>
            </View>
            <View
              style={{
                height: 10,
                borderRadius: 999,
                overflow: "hidden",
                backgroundColor: colors.cardBorder,
              }}
            >
              <View
                style={{
                  width: (() => {
                    const current = profile?.current_weight;
                    const target = profile?.target_weight;
                    if (!current || !target) return "0%";
                    return `${Math.max(
                      0,
                      Math.min(100, Math.round((target / current) * 100)),
                    )}%`;
                  })(),
                  height: "100%",
                  backgroundColor: colors.text,
                  borderRadius: 999,
                }}
              />
            </View>
          </View>
        </View>

        {/* ── Workout History ──────────────────────────────────────────────── */}
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.text} className="font-dmsans-bold text-base mb-3">
            Workout History
          </Text>

          {logsError ? (
            <View
              style={[
                styles.card,
                { borderWidth: 2, borderRadius: 14, padding: 14 },
              ]}
            >
              <Text style={styles.textMuted} className="font-dmsans text-sm">
                {logsError}
              </Text>
            </View>
          ) : recentLogs.length === 0 ? (
            <View
              style={[
                styles.card,
                {
                  borderWidth: 2,
                  borderRadius: 14,
                  padding: 20,
                  alignItems: "center",
                  gap: 8,
                },
              ]}
            >
              <Dumbbell size={26} color={colors.textMuted} strokeWidth={1.5} />
              <Text
                style={styles.textMuted}
                className="font-dmsans text-sm text-center"
              >
                No workouts logged yet
              </Text>
            </View>
          ) : (
            recentLogs.map((log) => (
              <View
                key={log.id}
                style={[
                  styles.card,
                  {
                    borderWidth: 2,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 8,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={[styles.text, { flex: 1, marginRight: 8 }]}
                    className="font-dmsans-bold text-sm"
                    numberOfLines={1}
                  >
                    {log.title}
                  </Text>
                  <View
                    style={{
                      borderWidth: 2,
                      borderColor: colors.borderMuted,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={styles.text}
                      className="font-dmsans-bold text-xs capitalize"
                    >
                      {log.plan_type}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Clock
                      size={12}
                      color={colors.textMuted}
                      strokeWidth={1.5}
                    />
                    <Text
                      style={styles.textMuted}
                      className="font-dmsans text-xs"
                    >
                      {log.duration_minutes} mins
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Dumbbell
                      size={12}
                      color={colors.textMuted}
                      strokeWidth={1.5}
                    />
                    <Text
                      style={styles.textMuted}
                      className="font-dmsans text-xs"
                    >
                      {log.exercises_count} exercises
                    </Text>
                  </View>
                  <Text
                    style={styles.textFaint}
                    className="font-dmsans text-xs"
                  >
                    {formatDate(log.completed_at)}
                  </Text>
                </View>
                {log.notes ? (
                  <Text
                    style={[styles.textMuted, { marginTop: 6 }]}
                    className="font-dmsans text-xs"
                    numberOfLines={2}
                  >
                    {log.notes}
                  </Text>
                ) : null}
              </View>
            ))
          )}

          {mealsError ? (
            <Text
              style={[styles.textMuted, { marginTop: 6 }]}
              className="font-dmsans text-xs"
            >
              {mealsError}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
