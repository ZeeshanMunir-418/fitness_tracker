import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

interface FoodItem {
  foodName: string;
  calories: number;
  fatGrams: number;
  proteinGrams: number;
  carbsGrams: number;
}

interface MealCardProps {
  openDropDown: boolean;
  setOpenDropDown: (key: string | null) => void;
  foodItems: FoodItem[];
  meal: string;
  mealKey: string; // add this
  totalCalories: number;
  mealInitials: string;
}
export const MealCard = ({
  openDropDown,
  setOpenDropDown,
  meal,
  mealInitials,
  mealKey,
  foodItems,
  totalCalories,
}: MealCardProps) => {
  return (
    <View className="border-2 border-black rounded-[28px] overflow-hidden">
      <Button
        onPress={() => setOpenDropDown(openDropDown ? null : mealKey)}
        variant="ghost"
        className="mt-0 flex-row items-center justify-between border-0 px-4 py-3"
      >
        <View className="flex-row items-center gap-3">
          <View className="rounded-full bg-black size-9 items-center justify-center">
            <Text className="font-dmsans-bold text-white text-sm">
              {mealInitials}
            </Text>
          </View>
          <Text className="font-dmsans-bold text-lg uppercase">{meal}</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="items-end">
            <Text className="text-3xl font-dmsans-bold leading-none">
              {totalCalories}
            </Text>
            <Text className="text-[10px] font-dmsans uppercase tracking-widest text-neutral-500 leading-none mt-1">
              kcal
            </Text>
          </View>
          {openDropDown ? (
            <ChevronUp size={24} color="#000" />
          ) : (
            <ChevronDown size={24} color="#000" />
          )}
        </View>
      </Button>

      {openDropDown && (
        <View className="border-t-2 border-black px-4 py-3 gap-3">
          {foodItems.map((item, index) => (
            <View key={index}>
              <View className="flex-row items-center justify-between">
                <Text className="font-dmsans-bold text-base flex-1 mr-4">
                  {item.foodName}
                </Text>
                <Text className="font-dmsans-bold text-2xl leading-none">
                  {item.calories}
                </Text>
              </View>
              <View className="flex-row gap-4 mt-1">
                <Text className="text-xs text-neutral-500 font-dmsans">
                  P: {item.proteinGrams}g
                </Text>
                <Text className="text-xs text-neutral-500 font-dmsans">
                  C: {item.carbsGrams}g
                </Text>
                <Text className="text-xs text-neutral-500 font-dmsans">
                  F: {item.fatGrams}g
                </Text>
              </View>
              {index < foodItems.length - 1 && (
                <View className="border-b border-neutral-200 mt-3" />
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
