import { calcDisplayPercent, calcPercentage } from "@/utils/calorie";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

export const useAnimation = (intake: number, goal: number) => {
  const percentage = calcPercentage(intake, goal);
  const displayPercent = calcDisplayPercent(intake, goal);

  const animatedValue = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const cfg = {
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    };
    Animated.timing(animatedValue, { toValue: percentage, ...cfg }).start();
    Animated.timing(countAnim, { toValue: displayPercent, ...cfg }).start();
  }, [intake, goal, percentage, displayPercent, animatedValue, countAnim]);

  useEffect(() => {
    const progressId = animatedValue.addListener(({ value }) => {
      setProgress(value);
    });

    const countId = countAnim.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });

    return () => {
      animatedValue.removeListener(progressId);
      countAnim.removeListener(countId);
    };
  }, [animatedValue, countAnim]);

  return {
    animatedValue,
    countAnim,
    percentage,
    displayPercent,
    progress,
    displayValue,
  };
};