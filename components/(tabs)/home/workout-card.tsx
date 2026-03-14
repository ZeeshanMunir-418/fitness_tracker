import { Link } from "expo-router";
import { Clock, Dumbbell } from "lucide-react-native";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

export interface Workout {
  id: number;
  title: string;
  image: number;
  duration: string;
  exercisesCount: number;
}

const WorkoutCard = ({
  id,
  title,
  image,
  duration,
  exercisesCount,
}: Workout) => {
  return (
    <View className="bg-white w-full p-6 rounded-3xl border-2 border-black flex-row items-center">
      <View className="w-20 h-20">
        <Image source={image} className="w-full h-full" resizeMode="contain" />
      </View>
      <View className="flex-1 ml-4 gap-2">
        <Text className="text-2xl font-bold" numberOfLines={2}>
          {title}
        </Text>
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Clock size={13} color="#6b7280" />
            <Text className="text-xs text-gray-500 font-medium">
              {duration}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Dumbbell size={13} color="#6b7280" />
            <Text className="text-xs text-gray-500 font-medium">
              {exercisesCount} EXERCISES
            </Text>
          </View>
        </View>
        <Link href={`/workout/${id}`} asChild>
          <TouchableOpacity className="rounded-full bg-black overflow-hidden self-start mt-2">
            <View className="absolute top-0 left-[10%] right-[10%] h-1/2 bg-white/10 rounded-b-full" />
            <Text className="text-white font-semibold text-base px-5 py-2">
              Start Now
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
};

export default WorkoutCard;
