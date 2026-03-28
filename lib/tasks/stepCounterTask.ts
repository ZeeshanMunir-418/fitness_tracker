import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { readBaseline, saveBaseline, saveStepsToStorage } from "../stepCounter";

export const STEP_COUNTER_TASK = "APEX_STEP_COUNTER_TASK";

TaskManager.defineTask(STEP_COUNTER_TASK, async () => {
  console.log("[stepTask] background task running");

  try {
    const { Pedometer } = await import("expo-sensors");

    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) {
      console.log("[stepTask] pedometer not available");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
    );

    const result = await Pedometer.getStepCountAsync(startOfToday, now);
    const hardwareSteps = result.steps;
    console.log("[stepTask] hardware steps since midnight:", hardwareSteps);

    // getStepCountAsync already returns steps since midnight,
    // so baseline should be 0, not the raw hardware count.
    let baseline = await readBaseline();
    if (baseline === null) {
      await saveBaseline(0, true);
      baseline = 0;
      console.log("[stepTask] baseline initialized to 0");
    }

    const todaySteps = Math.max(0, hardwareSteps - baseline);
    await saveStepsToStorage(todaySteps);

    console.log("[stepTask] steps today:", todaySteps);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("[stepTask] task failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerStepCounterTask = async (): Promise<void> => {
  try {
    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(STEP_COUNTER_TASK);

    if (isRegistered) {
      console.log("[stepTask] already registered");
      return;
    }

    await BackgroundFetch.registerTaskAsync(STEP_COUNTER_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log("[stepTask] registered successfully");
  } catch (error) {
    console.error("[stepTask] registration failed:", error);
  }
};

export const unregisterStepCounterTask = async (): Promise<void> => {
  try {
    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(STEP_COUNTER_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(STEP_COUNTER_TASK);
      console.log("[stepTask] unregistered");
    }
  } catch (error) {
    console.error("[stepTask] unregister failed:", error);
  }
};
