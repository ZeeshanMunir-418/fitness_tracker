import { useTheme } from "@/lib/theme/ThemeContext";
import React from "react";
import { Text, View } from "react-native";

export interface KeyMetrics {
  icon: React.ElementType;
  value: string | number;
  label: string;
}

export const MetricCard: React.FC<KeyMetrics> = ({
  icon: Icon,
  value,
  label,
}) => {
  const { colors } = useTheme();

  return (
    <View
      className="border-2 border-black bg-white p-4 flex-1 items-center justify-center rounded-2xl"
      style={{ borderColor: colors.border, backgroundColor: colors.inputBg }}
    >
      <Icon size={36} color={colors.text} />
      <Text
        className="text-xl font-dmsans-bold mt-4 mb-1"
        style={{ color: colors.text }}
      >
        {value}
      </Text>
      <Text
        className="text-gray-600 font-dmsans leading-none uppercase"
        style={{ color: colors.textMuted }}
      >
        {label}
      </Text>
    </View>
  );
};
