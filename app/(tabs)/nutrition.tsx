import { AddMealModal } from "@/components/(tabs)/nutrition/add-meal-modal";
import { CalorieBanner } from "@/components/(tabs)/nutrition/calorie-banner";
import { MealCard } from "@/components/(tabs)/nutrition/meal-cards";
import { Progress } from "@/components/(tabs)/nutrition/progress";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const dailyMeals = {
  breakfast: {
    totalCalories: 445,
    foodItems: [
      {
        foodName: "Scrambled Eggs",
        calories: 220,
        fatGrams: 15,
        proteinGrams: 18,
        carbsGrams: 2,
      },
      {
        foodName: "Whole Wheat Toast",
        calories: 130,
        fatGrams: 2,
        proteinGrams: 5,
        carbsGrams: 24,
      },
      {
        foodName: "Banana",
        calories: 90,
        fatGrams: 0,
        proteinGrams: 1,
        carbsGrams: 23,
      },
      {
        foodName: "Black Coffee",
        calories: 5,
        fatGrams: 0,
        proteinGrams: 0,
        carbsGrams: 1,
      },
    ],
  },
  lunch: {
    totalCalories: 610,
    foodItems: [
      {
        foodName: "Grilled Chicken Breast",
        calories: 280,
        fatGrams: 6,
        proteinGrams: 52,
        carbsGrams: 0,
      },
      {
        foodName: "Brown Rice",
        calories: 215,
        fatGrams: 2,
        proteinGrams: 5,
        carbsGrams: 45,
      },
      {
        foodName: "Steamed Broccoli",
        calories: 55,
        fatGrams: 0,
        proteinGrams: 4,
        carbsGrams: 11,
      },
      {
        foodName: "Olive Oil Dressing",
        calories: 60,
        fatGrams: 7,
        proteinGrams: 0,
        carbsGrams: 0,
      },
    ],
  },
};

const NutritionScreen = () => {
  const router = useRouter();
  const [openModal, setOpenModal] = useState(false);
  const [openDropDown, setOpenDropDown] = useState<string | null>("breakfast");

  const nutritionStats = [
    { label: "Carbs", intake: 250, goal: 300 },
    { label: "Protein", intake: 120, goal: 150 },
    { label: "Fats", intake: 70, goal: 80 },
  ];

  return (
    <SafeAreaView className="bg-white flex-1 p-4">
      <View className="flex-row items-center justify-between mb-8">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 border-2 border-black rounded-full bg-white"
          >
            <ChevronLeft size={28} color="#000" />
          </TouchableOpacity>
          <Text className="text-3xl font-dmsans-bold uppercase tracking-tight leading-none">
            Nutrition
          </Text>
        </View>
        <View>
          <TouchableOpacity
            onPress={() => {
              console.log("Open filter modal");
              setOpenModal((prev) => !prev);
            }}
            className="bg-white p-2 border-2 border-black rounded-full"
          >
            <SlidersHorizontal size={28} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row items-center justify-between gap-4 mb-8 border-2 border-black rounded-full p-4">
        <TouchableOpacity>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-dmsans-bold">Today, 15 March</Text>
        <TouchableOpacity>
          <ChevronRight size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View className="w-full h-1 border-2 border-black rounded-xl mb-8" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8">
          <CalorieBanner goal={2500} intake={1850} />
          <View>
            {nutritionStats.map((stat, index) => (
              <View key={index} className="mb-6">
                <Progress
                  leftText={stat.label}
                  rightText={`${stat.intake}/${stat.goal}g`}
                  intake={stat.intake}
                  goal={stat.goal}
                />
              </View>
            ))}
          </View>
        </View>

        <View className="w-full h-1 border-2 border-black rounded-xl mb-8" />

        <View className="gap-3">
          {(
            Object.entries(dailyMeals) as [
              keyof typeof dailyMeals,
              (typeof dailyMeals)[keyof typeof dailyMeals],
            ][]
          ).map(([mealKey, mealData]) => {
            const mealName = `${mealKey.charAt(0).toUpperCase()}${mealKey.slice(1)}`;
            const mealInitial = mealName.charAt(0);
            const isOpen = openDropDown === mealKey;

            return (
              <MealCard
                key={mealKey}
                mealKey={mealKey}
                openDropDown={isOpen}
                setOpenDropDown={setOpenDropDown}
                mealInitials={mealInitial}
                meal={mealName}
                foodItems={mealData.foodItems}
                totalCalories={mealData.totalCalories}
              />
            );
          })}
        </View>
      </ScrollView>
      <AddMealModal
        visible={openModal}
        onClose={() => setOpenModal(false)}
        onSave={(
          _mealKey: "breakfast" | "lunch" | "dinner" | "snacks",
          _items,
        ) => setOpenModal(false)}
      />
    </SafeAreaView>
  );
};

export default NutritionScreen;
