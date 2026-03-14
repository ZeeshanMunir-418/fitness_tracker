import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CalorieRingProps {
  intake: number; // calories consumed
  goal: number; // calorie goal
  size?: number; // diameter of the ring
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

  const percentage = Math.min(intake / goal, 1);
  const displayPercent = Math.round((intake / goal) * 100);

  const animatedValue = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    Animated.timing(countAnim, {
      toValue: displayPercent,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [intake, goal, percentage, displayPercent, animatedValue, countAnim]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

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
        <AnimatedCircle
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
        <AnimatedCounter animatedValue={countAnim} suffix="%" />
        <View className="w-20 h-1 rounded bg-black my-1.5" />
        <Text className="text-2xl font-bold text-black tracking-wide">
          {intake.toLocaleString()}
        </Text>
        <Text className="text-2xl font-normal text-neutral-500 mt-0.5">
          / {goal.toLocaleString()} kcal
        </Text>
      </View>
    </View>
  );
};

// ─── Animated counter ────────────────────────────────────────────────────────

interface AnimatedCounterProps {
  animatedValue: Animated.Value;
  suffix?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  animatedValue,
  suffix = "",
}) => {
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    const id = animatedValue.addListener(({ value }) =>
      setDisplay(Math.round(value)),
    );
    return () => animatedValue.removeListener(id);
  }, [animatedValue]);

  return (
    <Text className="text-6xl font-extrabold text-black -tracking-tight">
      {display}
      {suffix}
    </Text>
  );
};
