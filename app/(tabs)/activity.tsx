import {
    readStepsFromStorage,
    readStepsHistory,
    type StepsHistory,
} from "@/lib/stepCounter";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useThemeStyles } from "@/lib/theme/useThemeStyles";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchTodayMeals } from "@/store/slices/dailyMealSlice";
import { fetchProfile } from "@/store/slices/profileSlice";
import { fetchWorkoutLogs } from "@/store/slices/workoutLogSlice";
import {
    Activity,
    Apple,
    Clock,
    Coffee,
    Dumbbell,
    Flame,
    GlassWater,
    Moon,
    Sun,
    TrendingUp,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable as RNPressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Types ──────────────────────────────────────────────────────────────────────
type StepPeriod = "daily" | "weekly" | "monthly";

// ── Helpers ────────────────────────────────────────────────────────────────────
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"] as const;

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
            {/* Value label above bar */}
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

            {/* Rounded bar */}
            <View
              style={{
                width: "100%",
                height: barH,
                borderRadius: 999,
                backgroundColor: isHighlight ? colors.text : colors.borderMuted,
              }}
            />

            {/* X-axis label */}
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

// ── Steps Section ──────────────────────────────────────────────────────────────
const StepsSection = ({ todaySteps }: { todaySteps: number }) => {
  const { colors } = useTheme();
  const styles = useThemeStyles();
  const [period, setPeriod] = useState<StepPeriod>("weekly");
  const [history, setHistory] = useState<StepsHistory>({});

  useEffect(() => {
    readStepsHistory().then(setHistory);
  }, []);

  const chartData = useMemo(() => {
    const today = new Date();
    const todayIso = today.toISOString().split("T")[0];

    if (period === "daily") {
      const currentHour = today.getHours();
      const hours = [0, 3, 6, 9, 12, 15, 18, 21];
      return hours.map((h) => {
        const isPast = h <= currentHour;
        const isCurrentBucket =
          h ===
          hours[
            hours.reduce(
              (closest, hh, i) =>
                Math.abs(hh - currentHour) <
                Math.abs(hours[closest] - currentHour)
                  ? i
                  : closest,
              0,
            )
          ];
        const label =
          h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`;
        const fraction = isPast
          ? Math.min(1, h / Math.max(currentHour || 1, 1))
          : 0;
        const value = isCurrentBucket
          ? todaySteps
          : isPast
            ? Math.round(todaySteps * fraction * 0.85)
            : 0;
        return { label, value };
      });
    }

    if (period === "weekly") {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const todayDayIdx = today.getDay();
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (todayDayIdx - i));
        const iso = d.toISOString().split("T")[0];
        const isToday = iso === todayIso;
        const isFuture = i > todayDayIdx;
        return {
          label: dayNames[i],
          value: isFuture ? 0 : isToday ? todaySteps : (history[iso] ?? 0),
        };
      });
    }

    // Monthly — last 4 weeks summed
    return Array.from({ length: 4 }, (_, weekIndex) => {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (3 - weekIndex) * 7 - today.getDay());
      let total = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + d);
        const iso = day.toISOString().split("T")[0];
        total += iso === todayIso ? todaySteps : (history[iso] ?? 0);
      }
      return { label: `W${weekIndex + 1}`, value: total };
    });
  }, [period, todaySteps, history]);

  const maxValue = Math.max(...chartData.map((d) => d.value), 1000);

  const highlightIndex = useMemo(() => {
    if (period === "daily") {
      const currentHour = new Date().getHours();
      const hours = [0, 3, 6, 9, 12, 15, 18, 21];
      return hours.reduce(
        (closest, h, i) =>
          Math.abs(h - currentHour) < Math.abs(hours[closest] - currentHour)
            ? i
            : closest,
        0,
      );
    }
    if (period === "weekly") return new Date().getDay();
    return 3;
  }, [period]);

  const PERIODS: { label: string; value: StepPeriod }[] = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
  ];

  const stepGoal = 10000;
  const stepProgress = Math.min(1, todaySteps / stepGoal);
  const isEmpty = chartData.every((d) => d.value === 0);

  return (
    <View style={{ marginBottom: 24 }}>
      {/* Section header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Text style={styles.text} className="font-dmsans-bold text-base">
          Steps
        </Text>
        {/* Period pills */}
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
            <TrendingUp size={16} color={colors.text} strokeWidth={1.5} />
            <Text style={styles.text} className="font-dmsans-bold text-sm">
              Today
            </Text>
          </View>
          <Text style={styles.text} className="font-dmsans-bold text-xl">
            {todaySteps.toLocaleString()}
            <Text style={styles.textMuted} className="font-dmsans text-xs">
              {" "}
              / {stepGoal.toLocaleString()} steps
            </Text>
          </Text>
        </View>

        {/* Progress bar */}
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
              width: `${Math.round(stepProgress * 100)}%`,
              height: "100%",
              backgroundColor: colors.text,
              borderRadius: 999,
            }}
          />
        </View>

        {/* Bar chart */}
        <BarChart
          data={chartData}
          maxValue={maxValue}
          highlightIndex={highlightIndex}
        />

        {/* Empty state */}
        {isEmpty && (
          <Text
            style={[
              styles.textFaint,
              { textAlign: "center", fontSize: 12, marginTop: 8 },
            ]}
            className="font-dmsans"
          >
            Start walking to see your step history
          </Text>
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
  const calorieProgress =
    calorieGoal > 0 ? Math.min(1, todayCalories / calorieGoal) : 0;

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

        {/* ── Steps chart ──────────────────────────────────────────────────── */}
        <StepsSection todaySteps={todaySteps} />

        {/* ── Today's Nutrition ────────────────────────────────────────────── */}
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.text} className="font-dmsans-bold text-base mb-3">
            Today&apos;s Nutrition
          </Text>

          {/* Calorie progress */}
          <View
            style={[
              styles.card,
              { borderWidth: 2, borderRadius: 14, padding: 14 },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Flame size={16} color={colors.text} strokeWidth={1.5} />
                <Text style={styles.text} className="font-dmsans-bold text-sm">
                  Calories
                </Text>
              </View>
              <Text style={styles.textMuted} className="font-dmsans text-xs">
                {todayCalories} / {calorieGoal || "--"}
              </Text>
            </View>
            <View
              style={{
                height: 12,
                borderRadius: 999,
                overflow: "hidden",
                backgroundColor: colors.cardBorder,
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
            <Text
              style={[styles.textMuted, { marginTop: 6 }]}
              className="font-dmsans text-xs"
            >
              {Math.round(calorieProgress * 100)}% of target
            </Text>
          </View>

          {/* Water goal */}
          <View
            style={[
              styles.card,
              {
                borderWidth: 2,
                borderRadius: 14,
                padding: 14,
                marginTop: 8,
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
              {profile?.daily_water_goal_liters ?? "--"}L
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
