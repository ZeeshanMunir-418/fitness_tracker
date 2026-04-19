import { scheduleLocalNotification } from "@/lib/notifications";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    addWaterLog,
    deleteWaterLog,
    fetchTodayWaterLogs,
    setWaterGoal,
    type WaterLog,
} from "@/store/slices/waterSlice";
import { useCallback, useEffect, useMemo } from "react";

interface UseWaterResult {
  totalMlToday: number;
  goalMl: number;
  percentage: number;
  todayLogs: WaterLog[];
  loading: boolean;
  addWater: (ml: number) => void;
  deleteLog: (id: string) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const useWater = (): UseWaterResult => {
  const dispatch = useAppDispatch();
  const {
    totalMlToday,
    todayLogs,
    loading,
    goalMl: localGoalMl,
  } = useAppSelector((s) => s.water);

  const goalFromProfileMl = useAppSelector((s) => {
    const liters = s.profile.data?.daily_water_goal_liters ?? 2;
    return Math.round(liters * 1000);
  });

  useEffect(() => {
    void dispatch(fetchTodayWaterLogs());
  }, [dispatch]);

  useEffect(() => {
    dispatch(setWaterGoal(goalFromProfileMl));
  }, [dispatch, goalFromProfileMl]);

  const percentage = useMemo(() => {
    if (localGoalMl <= 0) return 0;
    return clamp((totalMlToday / localGoalMl) * 100, 0, 100);
  }, [localGoalMl, totalMlToday]);

  const addWater = useCallback(
    (ml: number) => {
      if (!Number.isFinite(ml) || ml <= 0) {
        return;
      }

      const roundedMl = Math.round(ml);

      void dispatch(addWaterLog(roundedMl))
        .unwrap()
        .then(async (addedLog) => {
          const nextTotal =
            totalMlToday + Number(addedLog.amount_ml || roundedMl);
          if (totalMlToday < localGoalMl && nextTotal >= localGoalMl) {
            await scheduleLocalNotification(
              "Goal Crushed! 🎉",
              "You hit your water goal for today. Amazing work!",
              { screen: "/(tabs)", action: "water_goal_reached" },
            );
          }
        })
        .catch((error) => {
          console.error("[water] addWater failed", error);
        });
    },
    [dispatch, localGoalMl, totalMlToday],
  );

  const deleteLog = useCallback(
    (id: string) => {
      if (!id) return;
      void dispatch(deleteWaterLog(id)).catch((error) => {
        console.error("[water] deleteLog failed", error);
      });
    },
    [dispatch],
  );

  return {
    totalMlToday,
    goalMl: localGoalMl,
    percentage,
    todayLogs,
    loading,
    addWater,
    deleteLog,
  };
};
