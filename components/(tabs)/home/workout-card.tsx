import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Link } from "expo-router";
import { Clock, Dumbbell } from "lucide-react-native";
import React from "react";
import { Image, Text, View } from "react-native";

export interface Workout {
  id: number;
  title: string;
  image: number;
  duration: string;
  exercisesCount: number;
  day?: string;
}

const WorkoutCard = ({
  id,
  title,
  image,
  duration,
  exercisesCount,
}: Workout) => {
  const { colors } = useTheme();

  return (
    <View
      className="bg-white w-full p-6 rounded-3xl border-2 border-black flex-row items-center"
      style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
    >
      <View className="w-20 h-20">
        <Image source={image} className="w-full h-full" resizeMode="contain" />
      </View>
      <View className="flex-1 ml-4 gap-2">
        <Text
          className="text-2xl font-dmsans-bold"
          style={{ color: colors.text }}
          numberOfLines={2}
        >
          {title}
        </Text>
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Clock size={13} color={colors.textMuted} />
            <Text
              className="text-xs text-gray-500 font-medium font-dmsans"
              style={{ color: colors.textMuted }}
            >
              {duration}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Dumbbell size={13} color={colors.textMuted} />
            <Text
              className="text-xs text-gray-500 font-dmsans"
              style={{ color: colors.textMuted }}
            >
              {exercisesCount} EXERCISES
            </Text>
          </View>
        </View>
        <Link href="/workouts" asChild>
          <Button>
            <Text className="text-white font-dmsans text-base">Start Now</Text>
          </Button>
        </Link>
      </View>
    </View>
  );
};

export default WorkoutCard;
