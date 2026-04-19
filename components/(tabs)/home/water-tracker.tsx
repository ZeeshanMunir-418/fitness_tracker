import { useTheme } from "@/lib/theme/ThemeContext";
import { cn } from "@/utils/cn";
import { CheckCircle2, Droplets } from "lucide-react-native";
import React, { useRef } from "react";
import {
  Alert,
  Animated,
  Pressable,
  Text,
  View,
  type DimensionValue,
} from "react-native";
import { useWater } from "../../../lib/hooks/useWater";

const QUICK_ADD_AMOUNTS = [150, 250, 500];

const toLitersLabel = (ml: number) => `${(ml / 1000).toFixed(1)}L`;

export const WaterTracker: React.FC = () => {
  const { colors } = useTheme();
  const {
    totalMlToday,
    goalMl,
    percentage,
    todayLogs,
    loading,
    addWater,
    deleteLog,
  } = useWater();

  const progressScale = useRef(new Animated.Value(1)).current;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const progressWidth = `${clampedPercentage}%` as DimensionValue;

  const handleQuickAdd = (ml: number) => {
    addWater(ml);

    Animated.sequence([
      Animated.spring(progressScale, {
        toValue: 1.03,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.spring(progressScale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete water log?", "This entry will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteLog(id),
      },
    ]);
  };

  return (
    <View
      className={cn("border-2 rounded-2xl p-4 mt-6")}
      style={{ borderColor: colors.border, backgroundColor: colors.inputBg }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Droplets size={20} color={colors.text} />
          <Text
            className="font-dmsans-bold text-lg"
            style={{ color: colors.text }}
          >
            Water Intake
          </Text>
        </View>
        {clampedPercentage >= 100 ? (
          <View className="flex-row items-center gap-1">
            <CheckCircle2 size={16} color="#22c55e" />
            <Text className="font-dmsans text-xs" style={{ color: "#22c55e" }}>
              Goal reached!
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-3">
        <Text className="font-dmsans" style={{ color: colors.textMuted }}>
          {toLitersLabel(totalMlToday)} / {toLitersLabel(goalMl)}
        </Text>

        <Animated.View
          className="h-3 rounded-full overflow-hidden mt-2"
          style={{
            backgroundColor: colors.borderMuted,
            transform: [{ scale: progressScale }],
          }}
        >
          <View
            className="h-full rounded-full"
            style={{ width: progressWidth, backgroundColor: "#000000" }}
          />
        </Animated.View>
      </View>

      <View className="flex-row gap-2 mt-4">
        {QUICK_ADD_AMOUNTS.map((ml) => (
          <Pressable
            key={ml}
            onPress={() => handleQuickAdd(ml)}
            className="px-3 py-2 rounded-full border"
            style={{ borderColor: colors.border, backgroundColor: colors.card }}
          >
            <Text
              className="font-dmsans-bold text-xs"
              style={{ color: colors.text }}
            >
              +{ml}ml
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mt-4 gap-2">
        {loading ? (
          <Text
            className="font-dmsans text-xs"
            style={{ color: colors.textMuted }}
          >
            Loading water logs...
          </Text>
        ) : todayLogs.length === 0 ? (
          <Text
            className="font-dmsans text-xs"
            style={{ color: colors.textMuted }}
          >
            No logs yet today.
          </Text>
        ) : (
          todayLogs.slice(0, 6).map((log) => (
            <Pressable
              key={log.id}
              onLongPress={() => confirmDelete(log.id)}
              delayLongPress={250}
              className="px-3 py-2 rounded-xl border flex-row items-center justify-between"
              style={{
                borderColor: colors.borderMuted,
                backgroundColor: colors.card,
              }}
            >
              <Text className="font-dmsans" style={{ color: colors.text }}>
                {log.amount_ml}ml
              </Text>
              <Text
                className="font-dmsans text-xs"
                style={{ color: colors.textMuted }}
              >
                Long-press to delete
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
};
