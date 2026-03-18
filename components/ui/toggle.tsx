import { useTheme } from "@/lib/theme/ThemeContext";
import React, { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const Toggle = ({ value, onValueChange, disabled }: ToggleProps) => {
  const { colors } = useTheme();
  const translateX = useSharedValue(value ? 22 : 2);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    const next = !value;
    translateX.value = withTiming(next ? 22 : 2, { duration: 150 });
    onValueChange(next);
  };

  useEffect(() => {
    translateX.value = withTiming(value ? 22 : 2, { duration: 150 });
  }, [value]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={{
        width: 50,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: value ? colors.border : colors.borderMuted,
        backgroundColor: value ? colors.border : colors.inputBg,
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Animated.View
        style={[
          {
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: value ? colors.background : colors.borderMuted,
            position: "absolute",
          },
          thumbStyle,
        ]}
      />
    </Pressable>
  );
};
