import { useAnimation } from "@/lib/hooks/useAnimation";
import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface CalorieRingProps {
  intake: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

export const CalorieRing: React.FC<CalorieRingProps> = ({
  intake,
  goal,
  size = 200,
  strokeWidth = 14,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const { progress, displayValue } = useAnimation(intake, goal);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#E5E5E5"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Animated foreground arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#000000"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Center labels */}
      <View className="absolute items-center justify-center">
        <Text className="text-6xl font-dmsans-bold text-black -tracking-tight">
          {displayValue}%
        </Text>
        <View className="w-20 h-1 rounded bg-black my-1.5" />
        <Text className="text-2xl font-dmsans-bold text-black tracking-wide">
          {intake.toLocaleString()}
        </Text>
        <Text className="text-2xl font-dmsans text-neutral-500 mt-0.5">
          / {goal.toLocaleString()} kcal
        </Text>
      </View>
    </View>
  );
};
