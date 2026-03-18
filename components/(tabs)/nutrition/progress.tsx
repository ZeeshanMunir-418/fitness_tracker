import { useAnimation } from "@/lib/hooks/useAnimation";
import { useTheme } from "@/lib/theme/ThemeContext";
import React from "react";
import { Text, View, type DimensionValue } from "react-native";

interface ProgressProps {
  rightText: string;
  leftText: string;
  intake: number;
  goal: number;
}

export const Progress: React.FC<ProgressProps> = ({
  rightText,
  leftText,
  intake,
  goal,
}) => {
  const { colors } = useTheme();
  const { progress } = useAnimation(intake, goal);
  const progressWidth = `${Math.round(progress * 100)}%` as DimensionValue;

  return (
    <View className="w-full gap-3">
      <View className="flex-row items-center justify-between -mb-1">
        <Text
          className="text-lg font-dmsans-bold text-black "
          style={{ color: colors.text }}
        >
          {leftText}
        </Text>
        <Text
          className="text-lg font-dmsans text-neutral-500 "
          style={{ color: colors.textMuted }}
        >
          {rightText}
        </Text>
      </View>

      <View
        className="h-3 w-full overflow-hidden rounded-full bg-neutral-200"
        style={{ backgroundColor: colors.borderMuted }}
      >
        <View
          className="h-full rounded-full bg-black"
          style={{ width: progressWidth, backgroundColor: colors.border }}
        />
      </View>
    </View>
  );
};
