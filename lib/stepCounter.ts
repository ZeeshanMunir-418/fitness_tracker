import AsyncStorage from "@react-native-async-storage/async-storage";

const STEPS_KEY = "apex_steps_today";
const STEPS_DATE_KEY = "apex_steps_date";
const STEPS_BASELINE_KEY = "apex_steps_baseline";
const STEPS_HISTORY_KEY = "apex_steps_history";

export const getTodayIso = () => new Date().toISOString().split("T")[0];

export const saveStepsToStorage = async (steps: number): Promise<void> => {
  try {
    const today = getTodayIso();
    await AsyncStorage.setItem(STEPS_KEY, String(steps));
    await AsyncStorage.setItem(STEPS_DATE_KEY, today);
    await saveStepsHistory(today, steps);
  } catch (error) {
    console.error("[stepCounter] saveStepsToStorage failed:", error);
  }
};

export const readStepsFromStorage = async (): Promise<number> => {
  try {
    const today = getTodayIso();
    const savedDate = await AsyncStorage.getItem(STEPS_DATE_KEY);

    if (savedDate !== today) {
      await AsyncStorage.setItem(STEPS_KEY, "0");
      await AsyncStorage.setItem(STEPS_DATE_KEY, today);
      await AsyncStorage.removeItem(STEPS_BASELINE_KEY);
      return 0;
    }

    const raw = await AsyncStorage.getItem(STEPS_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch (error) {
    console.error("[stepCounter] readStepsFromStorage failed:", error);
    return 0;
  }
};

export const saveBaseline = async (
  baseline: number,
  force = false,
): Promise<void> => {
  try {
    const existing = await AsyncStorage.getItem(STEPS_BASELINE_KEY);
    if (!existing || force) {
      await AsyncStorage.setItem(STEPS_BASELINE_KEY, String(baseline));
    }
  } catch (error) {
    console.error("[stepCounter] saveBaseline failed:", error);
  }
};

export const readBaseline = async (): Promise<number | null> => {
  try {
    const raw = await AsyncStorage.getItem(STEPS_BASELINE_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
};

export type StepsHistory = Record<string, number>;

export const readStepsHistory = async (): Promise<StepsHistory> => {
  try {
    const raw = await AsyncStorage.getItem(STEPS_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as StepsHistory) : {};
  } catch {
    return {};
  }
};

export const saveStepsHistory = async (
  date: string,
  steps: number,
): Promise<void> => {
  try {
    const history = await readStepsHistory();
    history[date] = steps;
    const keys = Object.keys(history).sort().reverse().slice(0, 35);
    const trimmed: StepsHistory = {};
    keys.forEach((k) => {
      trimmed[k] = history[k];
    });
    await AsyncStorage.setItem(STEPS_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("[stepCounter] saveStepsHistory failed:", error);
  }
};
