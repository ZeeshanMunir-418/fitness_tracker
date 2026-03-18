import { useAnimation } from "@/lib/hooks/useAnimation";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Flame } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface CalorieBannerProps {
  intake: number;
  goal: number;
}

export const CalorieBanner: React.FC<CalorieBannerProps> = ({
  intake,
  goal,
}) => {
  const { colors } = useTheme();
  const size = 128;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const { progress } = useAnimation(intake, goal);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View className="flex-row items-center px-4 py-3">
      {/* Left: consumed */}
      <View>
        <Text
          className="text-base font-dmsans text-neutral-400 uppercase tracking-widest"
          style={{ color: colors.textFaint }}
        >
          Consumed
        </Text>
        <Text
          className="text-2xl font-dmsans-bold text-black"
          style={{ color: colors.text }}
        >
          {intake.toLocaleString()}
        </Text>
        <Text
          className="text-base font-dmsans text-neutral-400"
          style={{ color: colors.textFaint }}
        >
          kcal
        </Text>
      </View>

      {/* Center: mini ring */}
      <View className="flex-1 items-center justify-center relative">
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.borderMuted}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Flame size={30} color={colors.text} />
        </View>
      </View>

      {/* Right: goal */}
      <View className="items-end">
        <Text
          className="text-base font-dmsans text-neutral-400 uppercase tracking-widest"
          style={{ color: colors.textFaint }}
        >
          Goal
        </Text>
        <Text
          className="text-2xl font-dmsans-bold text-black"
          style={{ color: colors.text }}
        >
          {goal.toLocaleString()}
        </Text>
        <Text
          className="text-base text-neutral-400 font-dmsans"
          style={{ color: colors.textFaint }}
        >
          kcal
        </Text>
      </View>
    </View>
  );
};
