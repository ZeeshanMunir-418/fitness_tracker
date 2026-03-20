import { useTheme } from "@/lib/theme/ThemeContext";
import {
  Apple,
  ChevronDown,
  ChevronUp,
  Coffee,
  Moon,
  Sun,
  UtensilsCrossed,
} from "lucide-react-native";
import React from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  UIManager,
  View,
} from "react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FoodItem {
  foodName: string;
  calories: number;
  fatGrams: number;
  proteinGrams: number;
  carbsGrams: number;
  servingSize: string;
}

interface MealCardProps {
  openDropDown: boolean;
  setOpenDropDown: (key: string | null) => void;
  foodItems: FoodItem[];
  meal: string;
  mealKey: string;
  totalCalories: number;
  mealInitials: string;
}

const MEAL_ICONS: Record<
  string,
  React.ComponentType<{ size: number; color: string; strokeWidth: number }>
> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snacks: Apple,
};

const MEAL_DESCRIPTIONS: Record<string, string> = {
  breakfast: "Start your day right",
  lunch: "Midday fuel",
  dinner: "Evening meal",
  snacks: "Between meals",
};

export const MealCard = ({
  openDropDown,
  setOpenDropDown,
  meal,
  mealKey,
  foodItems,
  totalCalories,
}: MealCardProps) => {
  const { colors, isDark } = useTheme();
  const MealIcon = MEAL_ICONS[mealKey] ?? UtensilsCrossed;
  const hasItems = foodItems.length > 0;

  const handleToggle = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(200, "easeInEaseOut", "opacity"),
    );
    setOpenDropDown(openDropDown ? null : mealKey);
  };

  return (
    <View
      className={`border-2 rounded-[20px] overflow-hidden mb-1 ${
        isDark ? "border-white/20 bg-neutral-900" : "border-black/10 bg-white"
      }`}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Pressable
        onPress={handleToggle}
        className="flex-row items-center justify-between px-4 py-3"
      >
        {/* Left: icon + name */}
        <View className="flex-row items-center gap-3">
          <View
            className={`w-10 h-10 rounded-full items-center justify-center ${
              isDark ? "bg-white" : "bg-black"
            }`}
          >
            <MealIcon
              size={18}
              color={isDark ? "#000" : "#fff"}
              strokeWidth={1.8}
            />
          </View>
          <View>
            <Text
              className={`font-dmsans-bold text-base uppercase tracking-wide ${
                isDark ? "text-white" : "text-black"
              }`}
            >
              {meal}
            </Text>
            <Text
              className={`font-dmsans text-xs mt-0.5 ${
                isDark ? "text-white/40" : "text-black/40"
              }`}
            >
              {hasItems
                ? `${foodItems.length} item${foodItems.length > 1 ? "s" : ""}`
                : (MEAL_DESCRIPTIONS[mealKey] ?? "No items logged")}
            </Text>
          </View>
        </View>

        {/* Right: calories + chevron */}
        <View className="flex-row items-center gap-2">
          <View className="items-end">
            <Text
              className={`font-dmsans-bold text-2xl leading-none ${
                isDark ? "text-white" : "text-black"
              }`}
            >
              {totalCalories}
            </Text>
            <Text
              className={`font-dmsans text-[10px] uppercase tracking-widest mt-0.5 ${
                isDark ? "text-white/40" : "text-black/40"
              }`}
            >
              kcal
            </Text>
          </View>
          {openDropDown ? (
            <ChevronUp
              size={20}
              color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"}
              strokeWidth={1.5}
            />
          ) : (
            <ChevronDown
              size={20}
              color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"}
              strokeWidth={1.5}
            />
          )}
        </View>
      </Pressable>

      {/* ── Expanded content ───────────────────────────────────────────────── */}
      {openDropDown && (
        <View
          className={`border-t-2 px-4 pt-3 pb-4 gap-3 ${
            isDark ? "border-white/10" : "border-black/8"
          }`}
        >
          {hasItems ? (
            foodItems.map((item, index) => (
              <View key={index}>
                {/* Food name + calories */}
                <View className="flex-row items-start justify-between">
                  <Text
                    className={`font-dmsans-bold text-sm flex-1 mr-3 leading-5 ${
                      isDark ? "text-white" : "text-black"
                    }`}
                  >
                    {item.foodName}
                  </Text>
                  <Text
                    className={`font-dmsans-bold text-base leading-none ${
                      isDark ? "text-white" : "text-black"
                    }`}
                  >
                    {item.calories}
                    <Text
                      className={`font-dmsans text-xs ${
                        isDark ? "text-white/40" : "text-black/40"
                      }`}
                    >
                      {" "}
                      kcal
                    </Text>
                  </Text>
                </View>

                {/* Macro pills row */}
                <View className="flex-row flex-wrap gap-x-3 gap-y-1 mt-1.5">
                  {[
                    {
                      label: "P",
                      value: `${item.proteinGrams}g`,
                      full: "Protein",
                    },
                    { label: "C", value: `${item.carbsGrams}g`, full: "Carbs" },
                    { label: "F", value: `${item.fatGrams}g`, full: "Fat" },
                  ].map((macro) => (
                    <View
                      key={macro.label}
                      className="flex-row items-center gap-1"
                    >
                      <Text
                        className={`font-dmsans text-[11px] ${
                          isDark ? "text-white/35" : "text-black/35"
                        }`}
                      >
                        {macro.full}
                      </Text>
                      <Text
                        className={`font-dmsans-bold text-[11px] ${
                          isDark ? "text-white/60" : "text-black/60"
                        }`}
                      >
                        {macro.value}
                      </Text>
                    </View>
                  ))}

                  {/* Serving size */}
                  {item.servingSize ? (
                    <View className="flex-row items-center gap-1">
                      <Text
                        className={`font-dmsans text-[11px] ${
                          isDark ? "text-white/35" : "text-black/35"
                        }`}
                      >
                        Serving
                      </Text>
                      <Text
                        className={`font-dmsans-bold text-[11px] ${
                          isDark ? "text-white/60" : "text-black/60"
                        }`}
                        numberOfLines={1}
                      >
                        {item.servingSize}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Divider between items */}
                {index < foodItems.length - 1 && (
                  <View
                    className={`border-b mt-3 ${
                      isDark ? "border-white/8" : "border-black/6"
                    }`}
                  />
                )}
              </View>
            ))
          ) : (
            /* Empty state */
            <View className="items-center py-4 gap-1.5">
              <MealIcon
                size={28}
                color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                strokeWidth={1.2}
              />
              <Text
                className={`font-dmsans text-sm ${
                  isDark ? "text-white/40" : "text-black/40"
                }`}
              >
                No {meal.toLowerCase()} logged yet
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};
