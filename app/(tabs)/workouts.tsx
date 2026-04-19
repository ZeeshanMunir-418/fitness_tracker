import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useThemeStyles } from "@/lib/theme/useThemeStyles";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { PlanType, WorkoutPlanDay } from "@/store/slices/workoutPlanSlice";
import { fetchActivePlans } from "@/store/slices/workoutPlanSlice";
import { workouts } from "@/utils/workouts";
import { Link } from "expo-router";
import { Dumbbell, Moon } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const getTodayDayNumber = () => {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
};

const fallbackImage = (dayNumber: number) => {
  const fallback = workouts[(dayNumber - 1) % workouts.length];
  return fallback?.image ?? workouts[0].image;
};

function WorkoutDayCard({
  day,
  isToday,
  planType,
}: {
  day: WorkoutPlanDay;
  isToday: boolean;
  planType: PlanType;
}) {
  const { colors } = useTheme();
  const styles = useThemeStyles();

  const gifUrl: string | null =
    Array.isArray(day.exercises) && day.exercises.length > 0
      ? (day.exercises[0]?.gifUrl ?? null)
      : null;

  const cardStyle = {
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderColor: isToday ? colors.border : colors.borderMuted,
    backgroundColor: isToday ? colors.card : "transparent",
  } as const;

  if (day.is_rest_day) {
    return (
      <View style={[styles.card, cardStyle]}>
        {isToday && (
          <View
            style={{
              borderWidth: 2,
              borderColor: colors.border,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
              alignSelf: "flex-start",
              marginBottom: 8,
            }}
          >
            <Text style={styles.text} className="font-dmsans-bold text-xs">
              Today
            </Text>
          </View>
        )}
        <View className="flex-row items-center justify-between">
          <View>
            <Text
              style={styles.textMuted}
              className="font-dmsans text-xs uppercase tracking-widest"
            >
              {day.day_name}
            </Text>
            <Text
              style={styles.text}
              className="font-dmsans-bold text-base mt-1"
            >
              Rest & Recovery
            </Text>
          </View>
          <Moon size={22} color={colors.textMuted} strokeWidth={1.5} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, cardStyle]}>
      {isToday && (
        <View
          style={{
            borderWidth: 2,
            borderColor: colors.border,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
            alignSelf: "flex-start",
            marginBottom: 10,
          }}
        >
          <Text style={styles.text} className="font-dmsans-bold text-xs">
            Today
          </Text>
        </View>
      )}

      {gifUrl ? (
        <Image
          source={fallbackImage(day.day_number)}
          style={{ width: "100%", height: 160, borderRadius: 12 }}
          resizeMode="contain"
        />
      ) : (
        <View
          style={{
            width: "100%",
            height: 100,
            borderRadius: 12,
            backgroundColor: colors.borderMuted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Dumbbell size={28} color={colors.textMuted} strokeWidth={1.5} />
        </View>
      )}

      <Text
        style={styles.textMuted}
        className="font-dmsans text-xs uppercase tracking-widest mt-3"
      >
        {day.day_name}
      </Text>
      <Text style={styles.text} className="font-dmsans-bold text-base mt-1">
        {day.title}
      </Text>
      {day.description ? (
        <Text style={styles.textMuted} className="font-dmsans text-sm mt-1">
          {day.description}
        </Text>
      ) : null}
      <Text style={styles.textMuted} className="font-dmsans text-xs mt-2">
        {day.exercises_count} exercises · {day.duration_minutes} min
      </Text>

      <Link
        href={{
          pathname: "/workouts/[id]",
          params: { id: day.id, planType },
        }}
        asChild
      >
        <Button className="mt-3" variant="outline">
          <Text style={styles.text} className="font-dmsans-bold text-sm">
            View Workout
          </Text>
        </Button>
      </Link>
    </View>
  );
}

export default function WorkoutsTabScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useThemeStyles();
  const { homePlan, gymPlan, loading, error } = useAppSelector(
    (s) => s.workoutPlan,
  );

  const [planType, setPlanType] = useState<PlanType>("home");

  useEffect(() => {
    if (!homePlan && !gymPlan) {
      void dispatch(fetchActivePlans());
    }
  }, [dispatch, homePlan, gymPlan]);

  // Auto-select whichever plan exists if only one is available
  useEffect(() => {
    if (!homePlan && gymPlan) setPlanType("gym");
    if (homePlan && !gymPlan) setPlanType("home");
  }, [homePlan, gymPlan]);

  const todayNumber = getTodayDayNumber();
  const hasBothPlans = Boolean(homePlan && gymPlan);

  const activePlanDays = useMemo(() => {
    const days =
      planType === "home"
        ? (homePlan?.workout_plan_days ?? [])
        : (gymPlan?.workout_plan_days ?? []);
    return [...days].sort((a, b) => a.day_number - b.day_number);
  }, [planType, homePlan, gymPlan]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-4 mb-6">
          <Text style={styles.text} className="font-dmsans-bold text-2xl">
            Workouts
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 4 }]}
            className="font-dmsans text-sm"
          >
            Weekly plan generated from your goals
          </Text>
        </View>

        {/* Plan type toggle — only shown when both plans exist */}
        {hasBothPlans && (
          <View className="flex-row gap-2 mb-4">
            {(["home", "gym"] as PlanType[]).map((type) => (
              <Button
                key={type}
                className="flex-1"
                variant={planType === type ? "primary" : "outline"}
                onPress={() => setPlanType(type)}
              >
                <Text
                  style={{
                    color: planType === type ? colors.background : colors.text,
                  }}
                  className="font-dmsans-bold text-sm capitalize"
                >
                  {type}
                </Text>
              </Button>
            ))}
          </View>
        )}

        {loading ? (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        ) : error ? (
          <View
            style={[
              styles.card,
              {
                borderWidth: 2,
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
              },
            ]}
          >
            <Text
              style={styles.textMuted}
              className="font-dmsans text-sm text-center"
            >
              {error}
            </Text>
            <Button
              className="mt-3"
              variant="outline"
              onPress={() => void dispatch(fetchActivePlans())}
            >
              <Text style={styles.text} className="font-dmsans-bold text-sm">
                Retry
              </Text>
            </Button>
          </View>
        ) : activePlanDays.length === 0 ? (
          <View
            style={[
              styles.card,
              {
                borderWidth: 2,
                borderRadius: 16,
                padding: 20,
                alignItems: "center",
              },
            ]}
          >
            <Dumbbell size={28} color={colors.textMuted} strokeWidth={1.5} />
            <Text
              style={[styles.textMuted, { marginTop: 8 }]}
              className="font-dmsans text-sm text-center"
            >
              No workouts available yet
            </Text>
          </View>
        ) : (
          activePlanDays.map((day) => (
            <WorkoutDayCard
              key={day.id}
              day={day}
              isToday={day.day_number === todayNumber}
              planType={planType}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
