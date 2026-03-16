import { useAnimation } from "@/lib/hooks/useAnimation";
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
        <Text className="text-base font-dmsans text-neutral-400 uppercase tracking-widest">
          Consumed
        </Text>
        <Text className="text-4xl font-dmsans-bold text-black">
          {intake.toLocaleString()}
        </Text>
        <Text className="text-base font-dmsans text-neutral-400">kcal</Text>
      </View>

      {/* Center: mini ring */}
      <View className="flex-1 items-center justify-center relative">
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#E5E5E5"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#000"
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
          <Flame size={30} color="#000" />
        </View>
      </View>

      {/* Right: goal */}
      <View className="items-end">
        <Text className="text-base font-dmsans text-neutral-400 uppercase tracking-widest">
          Goal
        </Text>
        <Text className="text-4xl font-dmsans-bold text-black">
          {goal.toLocaleString()}
        </Text>
        <Text className="text-base text-neutral-400 font-dmsans">kcal</Text>
      </View>
    </View>
  );
};
