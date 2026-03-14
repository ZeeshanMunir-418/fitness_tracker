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
  return (
    <View className="border-2 border-black bg-white p-4 flex-1 items-center justify-center rounded-2xl">
      <Icon size={36} color="#000" />
      <Text className='text-xl font-bold mt-4 mb-1'>{value}</Text>
      <Text className='text-gray-600 font-semibold leading-none uppercase'>{label}</Text>
    </View>
  );
};
