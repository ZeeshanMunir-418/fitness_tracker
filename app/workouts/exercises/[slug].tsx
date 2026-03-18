import { useTheme } from "@/lib/theme/ThemeContext";
import { useThemeStyles } from "@/lib/theme/useThemeStyles";
import { useAppDispatch } from "@/store/hooks";
import { logWorkout } from "@/store/slices/workoutLogSlice";
import type { WorkoutExercise } from "@/store/slices/workoutPlanSlice";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CheckCircle2, RotateCcw, Timer } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, Vibration, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

function RestCountdown({
  seconds,
  onDone,
}: {
  seconds: number;
  onDone: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemeStyles();
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      Vibration.vibrate(300);
      onDone();
      return;
    }

    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onDone]);

  return (
    <View className="items-center py-6">
      <Text
        style={styles.textMuted}
        className="font-dmsans text-xs uppercase tracking-widest"
      >
        Rest
      </Text>
      <Text
        style={[styles.text, { fontSize: 48, marginTop: 8 }]}
        className="font-dmsans-bold"
      >
        {remaining}s
      </Text>
      <Pressable
        onPress={onDone}
        className="rounded-full px-6 py-3 mt-4"
        style={{ borderWidth: 2, borderColor: colors.borderMuted }}
      >
        <Text style={styles.text} className="font-dmsans-bold text-sm">
          Skip
        </Text>
      </Pressable>
    </View>
  );
}

function Stopwatch() {
  const styles = useThemeStyles();
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const toggle = () => {
    if (running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setRunning(false);
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);
    setRunning(true);
  };

  const reset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setElapsed(0);
    setRunning(false);
  };

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <View className="items-center py-6">
      <Text
        style={styles.textMuted}
        className="font-dmsans text-xs uppercase tracking-widest"
      >
        Stopwatch
      </Text>
      <Text
        style={[styles.text, { fontSize: 40, marginTop: 8 }]}
        className="font-dmsans-bold"
      >
        {minutes}:{seconds}
      </Text>
      <View className="flex-row gap-2 mt-4">
        <Pressable
          onPress={toggle}
          className="rounded-full px-6 py-3"
          style={{ borderWidth: 2, borderColor: styles.border.borderColor }}
        >
          <Text style={styles.text} className="font-dmsans-bold text-sm">
            {running ? "Pause" : "Start"}
          </Text>
        </Pressable>
        <Pressable
          onPress={reset}
          className="rounded-full p-3"
          style={{
            borderWidth: 2,
            borderColor: styles.borderMuted.borderColor,
          }}
        >
          <RotateCcw size={18} color={styles.text.color} strokeWidth={1.5} />
        </Pressable>
      </View>
    </View>
  );
}

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useThemeStyles();

  const {
    id,
    exercise: exerciseParam,
    planType,
  } = useLocalSearchParams<{
    id: string;
    slug: string;
    exercise: string;
    planType: string;
  }>();

  const exercise = useMemo<WorkoutExercise | null>(() => {
    try {
      return exerciseParam
        ? (JSON.parse(exerciseParam) as WorkoutExercise)
        : null;
    } catch {
      return null;
    }
  }, [exerciseParam]);

  const [currentSet, setCurrentSet] = useState(1);
  const [completedSets, setCompletedSets] = useState<number[]>([]);
  const [isResting, setIsResting] = useState(false);
  const [done, setDone] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startRef = useRef(Date.now());

  const pressScale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  if (!exercise) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center">
          <Text style={styles.text} className="font-dmsans-bold text-lg">
            Exercise not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalSets = exercise.sets;

  const handleSetDone = async () => {
    pressScale.value = withSpring(1.08, undefined, () => {
      pressScale.value = withSpring(1);
    });

    setCompletedSets((prev) => [...prev, currentSet]);

    if (currentSet >= totalSets) {
      const durationMinutes = Math.max(
        1,
        Math.round((Date.now() - startRef.current) / 60000),
      );

      try {
        await dispatch(
          logWorkout({
            workout_plan_day_id: id,
            title: exercise.name,
            duration_minutes: durationMinutes,
            exercises_count: 1,
            plan_type: (planType as "home" | "gym") ?? "home",
            notes: `Completed ${totalSets} sets`,
          }),
        ).unwrap();
        console.log("[exerciseDetail] workout log saved");
      } catch (logError) {
        console.error("[exerciseDetail] workout log failed", logError);
        setSaveError("Workout save failed.");
      }

      setDone(true);
      return;
    }

    setIsResting(true);
  };

  const handleRestDone = () => {
    setIsResting(false);
    setCurrentSet((value) => value + 1);
  };

  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center px-6">
          <CheckCircle2 size={54} color={colors.text} strokeWidth={1.5} />
          <Text
            style={[styles.text, { marginTop: 10 }]}
            className="font-dmsans-bold text-xl"
          >
            Exercise Complete
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 6 }]}
            className="font-dmsans text-sm"
          >
            {exercise.name} · {totalSets} sets done
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 6 }]}
            className="font-dmsans text-xs"
          >
            {saveError ?? "Workout saved ✓"}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-5 rounded-xl px-8 py-3"
            style={{ backgroundColor: colors.text }}
          >
            <Text
              style={{ color: colors.background }}
              className="font-dmsans-bold text-sm"
            >
              Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 16,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text
          style={[styles.text, { fontSize: 22 }]}
          className="font-dmsans-bold"
          numberOfLines={1}
        >
          {exercise.name}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            { borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 12 },
          ]}
        >
          <Text
            style={styles.textMuted}
            className="font-dmsans text-xs uppercase tracking-widest"
          >
            {exercise.muscleGroup}
          </Text>
          <Text
            style={[styles.text, { marginTop: 4 }]}
            className="font-dmsans-bold text-lg"
          >
            {exercise.name}
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 8 }]}
            className="font-dmsans text-sm"
          >
            {exercise.instructions}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          {Array.from({ length: totalSets }).map((_, index) => {
            const value = index + 1;
            const complete = completedSets.includes(value);
            return (
              <View
                key={value}
                style={{
                  flex: 1,
                  borderWidth: 2,
                  borderRadius: 12,
                  height: 44,
                  justifyContent: "center",
                  alignItems: "center",
                  borderColor: complete ? colors.border : colors.borderMuted,
                  backgroundColor: complete ? colors.text : "transparent",
                }}
              >
                <Text
                  style={{ color: complete ? colors.background : colors.text }}
                  className="font-dmsans-bold text-sm"
                >
                  {value}
                </Text>
              </View>
            );
          })}
        </View>

        <View className="flex-row gap-2 mb-12">
          <View
            style={[
              styles.card,
              { borderWidth: 2, borderRadius: 12, padding: 10, flex: 1 },
            ]}
          >
            <Timer size={16} color={colors.text} strokeWidth={1.5} />
            <Text
              style={[styles.text, { marginTop: 6 }]}
              className="font-dmsans-bold text-sm"
            >
              {exercise.reps}
            </Text>
            <Text style={styles.textMuted} className="font-dmsans text-xs">
              Reps
            </Text>
          </View>
          <View
            style={[
              styles.card,
              { borderWidth: 2, borderRadius: 12, padding: 10, flex: 1 },
            ]}
          >
            <RotateCcw size={16} color={colors.text} strokeWidth={1.5} />
            <Text
              style={[styles.text, { marginTop: 6 }]}
              className="font-dmsans-bold text-sm"
            >
              {exercise.restSeconds}s
            </Text>
            <Text style={styles.textMuted} className="font-dmsans text-xs">
              Rest
            </Text>
          </View>
          <View
            style={[
              styles.card,
              { borderWidth: 2, borderRadius: 12, padding: 10, flex: 1 },
            ]}
          >
            <Text style={styles.text} className="font-dmsans-bold text-sm">
              {currentSet}/{totalSets}
            </Text>
            <Text
              style={[styles.textMuted, { marginTop: 6 }]}
              className="font-dmsans text-xs"
            >
              Current
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              borderWidth: 2,
              borderRadius: 16,
              marginTop: 8,
              marginBottom: 12,
            },
          ]}
        >
          {isResting ? (
            <RestCountdown
              seconds={exercise.restSeconds}
              onDone={handleRestDone}
            />
          ) : (
            <Stopwatch />
          )}
        </View>

        {!isResting ? (
          <Animated.View style={animatedStyle}>
            <Pressable
              onPress={handleSetDone}
              className="rounded-2xl py-4 items-center"
              style={{ backgroundColor: colors.text }}
            >
              <Text
                style={{ color: colors.background }}
                className="font-dmsans-bold text-base"
              >
                Set {currentSet} Done
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
