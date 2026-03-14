import { CalorieRing } from "@/components/(tabs)/home/calories-ring";
import {
  MetricCard,
  type KeyMetrics,
} from "@/components/(tabs)/home/metric-card";
import WorkoutCard, {
  type Workout,
} from "@/components/(tabs)/home/workout-card";
import { useGreeting } from "@/lib/hooks/useGreeting";
import { Link } from "expo-router";
import {
  ArrowRight,
  Droplets,
  Footprints,
  User,
  Zap,
} from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const HomeScreen = () => {
  const { greeting, day } = useGreeting();
  const keyMetrics: KeyMetrics[] = [
    { icon: Footprints, value: "8,432", label: "STEPS" },
    { icon: Droplets, value: "1.2L", label: "WATER" },
    { icon: Zap, value: "45", label: "MINS" },
  ];
  const workouts: Workout[] = [
    {
      id: 1,
      title: "Upper Body Strength Training",
      image: require("@/assets/images/upper-body-strength.png"),
      duration: "45 MIN",
      exercisesCount: 6,
    },
    {
      id: 2,
      title: "Core & Abs Blast",
      image: require("@/assets/images/core-abs.png"),
      duration: "30 MIN",
      exercisesCount: 8,
    },
    {
      id: 3,
      title: "Leg Day Power",
      image: require("@/assets/images/leg.png"),
      duration: "50 MIN",
      exercisesCount: 7,
    },
  ];

  return (
    <SafeAreaView className="flex-1">
      <View className="px-4 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-semibold">{greeting}</Text>
          <Text className="text-4xl font-bold">Muhammad Zain</Text>
        </View>
        <TouchableOpacity className="border-2 border-black p-3 rounded-full">
          <Link href="/profile">
            <User size={24} color="black" />
          </Link>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-4 mt-16 flex-row items-center justify-center ">
          <CalorieRing goal={2500} intake={1850} size={255} />
        </View>
        <View className="px-4 mt-16 flex-row items-center justify-center gap-4">
          {keyMetrics.map((metric, index) => (
            <MetricCard
              key={index}
              icon={metric.icon}
              value={metric.value}
              label={metric.label}
            />
          ))}
        </View>
        <View className="px-4 my-16 border-2 border-black max-w-32 w-full mx-auto rounded-xl" />

        <View className="px-4 mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-semibold">Today&apos;s Workout</Text>
            <Text className="text-sm text-gray-600 leading-none">{day}</Text>
          </View>
          <Link href="/workouts" asChild>
            <TouchableOpacity className="">
              <ArrowRight size={24} color="black" />
            </TouchableOpacity>
          </Link>
        </View>

        {/* Workout Cards */}
        <View className="px-4">
          {workouts.map((workout) => (
            <View key={workout.id} className="mb-6">
              <WorkoutCard
                id={workout.id}
                title={workout.title}
                image={workout.image}
                duration={workout.duration}
                exercisesCount={workout.exercisesCount}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
