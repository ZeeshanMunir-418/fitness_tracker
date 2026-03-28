import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  getTodayIso,
  readBaseline,
  readStepsFromStorage,
  saveBaseline,
  saveStepsToStorage,
} from "../stepCounter";

const STEPS_DATE_KEY = "apex_steps_date";

interface PedometerState {
  steps: number;
  available: boolean;
  granted: boolean;
  error: string | null;
}

export const usePedometer = (): PedometerState => {
  const [steps, setSteps] = useState(0);
  const [available, setAvailable] = useState(false);
  const [granted, setGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baselineRef = useRef<number | null>(null);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let isMounted = true;

    const setup = async () => {
      try {
        const { Pedometer } = await import("expo-sensors");

        // Show persisted steps from last session immediately
        const persisted = await readStepsFromStorage();
        if (isMounted) setSteps(persisted);

        const isAvailable = await Pedometer.isAvailableAsync();
        if (!isMounted) return;

        if (!isAvailable) {
          setAvailable(false);
          return;
        }

        setAvailable(true);

        const { granted: permissionGranted } =
          await Pedometer.requestPermissionsAsync();
        if (!isMounted) return;

        if (!permissionGranted) {
          setGranted(false);
          return;
        }

        setGranted(true);

        // Get steps since midnight
        const now = new Date();
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        );

        try {
          const past = await Pedometer.getStepCountAsync(startOfToday, now);
          const hardwareSteps = past.steps;

          // Check if it's a new day — baseline must be reset
          const savedDate = await AsyncStorage.getItem(STEPS_DATE_KEY);
          const today = getTodayIso();
          const isNewDay = savedDate !== today;

          let baseline = await readBaseline();

          if (baseline === null || isNewDay) {
            // getStepCountAsync already returns steps since midnight,
            // so the baseline offset should be 0 — not the raw hardware count.
            await saveBaseline(0, true);
            baseline = 0;
          }

          baselineRef.current = baseline;
          const todaySteps = Math.max(0, hardwareSteps - baseline);

          if (isMounted) {
            setSteps(todaySteps);
            await saveStepsToStorage(todaySteps);
          }
        } catch {
          console.log(
            "[pedometer] historical steps unavailable, using live watch only",
          );
        }

        // Live step subscription
        subscription = Pedometer.watchStepCount(async (result) => {
          if (!isMounted) return;

          const baseline = baselineRef.current ?? 0;
          const todaySteps = Math.max(0, result.steps - baseline);
          setSteps(todaySteps);
          await saveStepsToStorage(todaySteps);
        });
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : "Pedometer error";
        console.error("[pedometer] setup failed:", message);
        setError(message);
      }
    };

    setup();

    return () => {
      isMounted = false;
      subscription?.remove();
      console.log("[pedometer] cleanup");
    };
  }, []);

  return { steps, available, granted, error };
};
