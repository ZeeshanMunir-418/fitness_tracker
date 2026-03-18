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
  const { colors } = useTheme();
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
      style={{
        borderWidth: 2,
        borderRadius: 20,
        overflow: "hidden",
        borderColor: colors.border,
        backgroundColor: colors.card,
        marginBottom: 4,
      }}
    >
      {/* Header row */}
      <Pressable
        onPress={handleToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        {/* Left: icon + name */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              backgroundColor: colors.text,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MealIcon size={18} color={colors.background} strokeWidth={1.8} />
          </View>
          <View>
            <Text
              style={{ color: colors.text, fontSize: 15 }}
              className="font-dmsans-bold uppercase tracking-wide"
            >
              {meal}
            </Text>
            <Text
              style={{ color: colors.textFaint, fontSize: 11, marginTop: 2 }}
              className="font-dmsans"
            >
              {hasItems
                ? `${foodItems.length} item${foodItems.length > 1 ? "s" : ""}`
                : (MEAL_DESCRIPTIONS[mealKey] ?? "No items logged")}
            </Text>
          </View>
        </View>

        {/* Right: calories + chevron */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{ color: colors.text, fontSize: 22, lineHeight: 24 }}
              className="font-dmsans-bold"
            >
              {totalCalories}
            </Text>
            <Text
              style={{
                color: colors.textFaint,
                fontSize: 10,
                letterSpacing: 1.5,
                marginTop: 2,
              }}
              className="font-dmsans uppercase"
            >
              kcal
            </Text>
          </View>
          {openDropDown ? (
            <ChevronUp size={20} color={colors.textMuted} strokeWidth={1.5} />
          ) : (
            <ChevronDown size={20} color={colors.textMuted} strokeWidth={1.5} />
          )}
        </View>
      </Pressable>

      {/* Expanded food items */}
      {openDropDown && (
        <View
          style={{
            borderTopWidth: 2,
            borderTopColor: colors.cardBorder,
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 12,
          }}
        >
          {hasItems ? (
            foodItems.map((item, index) => (
              <View key={index}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{ color: colors.text, flex: 1, marginRight: 12 }}
                    className="font-dmsans-bold text-sm"
                  >
                    {item.foodName}
                  </Text>
                  <Text
                    style={{ color: colors.text }}
                    className="font-dmsans-bold text-lg"
                  >
                    {item.calories}
                    <Text
                      style={{ color: colors.textFaint, fontSize: 11 }}
                      className="font-dmsans"
                    >
                      {" "}
                      kcal
                    </Text>
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 16,
                    marginTop: 4,
                  }}
                >
                  {[
                    { label: "Protein", value: item.proteinGrams },
                    { label: "Carbs", value: item.carbsGrams },
                    { label: "Fat", value: item.fatGrams },
                  ].map((macro) => (
                    <View
                      key={macro.label}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <Text
                        style={{ color: colors.textFaint, fontSize: 11 }}
                        className="font-dmsans"
                      >
                        {macro.label}
                      </Text>
                      <Text
                        style={{ color: colors.textMuted, fontSize: 11 }}
                        className="font-dmsans-bold"
                      >
                        {macro.value}g
                      </Text>
                    </View>
                  ))}
                </View>
                {index < foodItems.length - 1 && (
                  <View
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: colors.cardBorder,
                      marginTop: 10,
                    }}
                  />
                )}
              </View>
            ))
          ) : (
            /* Empty state */
            <View
              style={{
                alignItems: "center",
                paddingVertical: 16,
                gap: 6,
              }}
            >
              <MealIcon size={28} color={colors.textFaint} strokeWidth={1.2} />
              <Text
                style={{ color: colors.textMuted, fontSize: 13 }}
                className="font-dmsans"
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
