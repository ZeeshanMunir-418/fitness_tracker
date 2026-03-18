import { useEffect, useRef, useState } from "react";
import {
  readBaseline,
  readStepsFromStorage,
  saveBaseline,
  saveStepsToStorage,
} from "../stepCounter";

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

        // Immediately show persisted steps from last session
        const persisted = await readStepsFromStorage();
        if (isMounted) setSteps(persisted);

        const isAvailable = await Pedometer.isAvailableAsync();
        if (!isMounted) return;

        if (!isAvailable) {
          console.log("[pedometer] not available on this device");
          setAvailable(false);
          return;
        }

        setAvailable(true);

        const { granted: permissionGranted } =
          await Pedometer.requestPermissionsAsync();
        if (!isMounted) return;

        if (!permissionGranted) {
          console.log("[pedometer] permission denied");
          setGranted(false);
          return;
        }

        setGranted(true);

        // Get historical steps since midnight
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
          console.log(
            "[pedometer] hardware steps since midnight:",
            hardwareSteps,
          );

          let baseline = await readBaseline();
          if (!baseline) {
            await saveBaseline(hardwareSteps);
            baseline = hardwareSteps;
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

          const baseline = baselineRef.current;
          const todaySteps =
            baseline !== null
              ? Math.max(0, result.steps - baseline)
              : result.steps;

          console.log("[pedometer] live update:", todaySteps);
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
