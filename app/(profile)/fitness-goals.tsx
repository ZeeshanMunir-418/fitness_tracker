import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FitnessGoalsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 py-6">
        <Text className="text-2xl font-dmsans-bold text-black">
          Fitness Goals
        </Text>
        <Text className="mt-2 text-sm font-dmsans text-gray-500">
          Set or update your fitness and activity goals.
        </Text>
      </View>
    </SafeAreaView>
  );
}
