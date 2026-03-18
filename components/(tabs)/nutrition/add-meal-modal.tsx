import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    clearResults,
    FoodItem,
    searchFood,
} from "@/store/slices/nutritionSlice";
import { X } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, View } from "react-native";

type MealKey = "breakfast" | "lunch" | "dinner" | "snacks";

const MEAL_KEYS: MealKey[] = ["breakfast", "lunch", "dinner", "snacks"];

interface AddMealModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (mealKey: MealKey, items: FoodItem[]) => void;
}

export const AddMealModal: React.FC<AddMealModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const { colors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const searchResults = useAppSelector((s) => s.nutrition.searchResults);
  const loading = useAppSelector((s) => s.nutrition.loading);
  const error = useAppSelector((s) => s.nutrition.error);

  const [selectedMeal, setSelectedMeal] = useState<MealKey>("breakfast");
  const [query, setQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<FoodItem[]>([]);

  const handleSearch = () => {
    if (query.trim()) {
      dispatch(searchFood(query.trim()));
    }
  };

  const handleAddItem = (item: FoodItem) => {
    if (!selectedItems.find((i) => i.foodId === item.foodId)) {
      setSelectedItems((prev) => [...prev, item]);
    }
  };

  const handleRemoveItem = (foodId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.foodId !== foodId));
  };

  const handleSave = () => {
    onSave(selectedMeal, selectedItems);
    handleClose();
  };

  const handleClose = () => {
    setQuery("");
    setSelectedItems([]);
    dispatch(clearResults());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <Button
          className="absolute inset-0 mt-0 border-0 bg-black/40 p-0"
          variant="ghost"
          onPress={handleClose}
        >
          <View />
        </Button>

        {/* Sheet */}
        <View
          className="bg-white rounded-t-3xl border-t-2 border-x-2 border-black px-4 pt-5 pb-10 max-h-[92%]"
          style={{
            backgroundColor: colors.background,
            borderColor: colors.border,
          }}
        >
          {/* Handle */}
          <View
            className="w-12 h-1 rounded-full bg-neutral-300 self-center mb-5"
            style={{ backgroundColor: colors.borderMuted }}
          />

          {/* Header */}
          <View className="flex-row items-center justify-between mb-5">
            <Text
              className="text-2xl font-dmsans-bold uppercase tracking-tight"
              style={{ color: colors.text }}
            >
              Add Food
            </Text>
            <Button
              onPress={handleClose}
              className="mt-0 rounded-full p-1"
              variant="outline"
              size="icon"
            >
              <X size={20} color={colors.text} />
            </Button>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Meal selector */}
            <Text
              className="text-xs font-dmsans uppercase tracking-widest text-neutral-500 mb-2"
              style={{ color: colors.textMuted }}
            >
              Meal
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {MEAL_KEYS.map((key) => (
                <Button
                  key={key}
                  onPress={() => setSelectedMeal(key)}
                  variant={selectedMeal === key ? "primary" : "outline"}
                  className={`mt-0 rounded-full px-4 py-2 ${
                    selectedMeal === key ? "bg-black" : "bg-white"
                  }`}
                >
                  <Text
                    className={`font-dmsans-bold text-sm uppercase tracking-tight ${
                      selectedMeal === key ? "text-white" : "text-black"
                    }`}
                    style={{
                      color:
                        selectedMeal === key
                          ? isDark
                            ? "#000000"
                            : "#ffffff"
                          : colors.text,
                    }}
                  >
                    {key}
                  </Text>
                </Button>
              ))}
            </View>

            <View
              className="w-full h-px border border-neutral-200 rounded-xl mb-5"
              style={{ borderColor: colors.borderMuted }}
            />

            {/* Search input */}
            <Text
              className="text-xs font-dmsans uppercase tracking-widest text-neutral-500 mb-2"
              style={{ color: colors.textMuted }}
            >
              Search Food
            </Text>
            <View className="flex-row gap-2 mb-4">
              <Input
                containerClassName="flex-1"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                placeholder="e.g. chicken biryani"
                className="py-3"
              />
              <Button
                onPress={handleSearch}
                className="mt-0 justify-center px-5 py-3"
              >
                <Text className="font-dmsans-bold text-white text-sm uppercase tracking-tight">
                  Search
                </Text>
              </Button>
            </View>

            {/* Error */}
            {error ? (
              <Text
                className="text-black font-dmsans text-sm mb-4 px-1"
                style={{ color: colors.text }}
              >
                {error}
              </Text>
            ) : null}

            {/* Loading */}
            {loading ? (
              <View className="items-center py-6">
                <ActivityIndicator color={colors.text} size="small" />
              </View>
            ) : null}

            {/* Search results */}
            {!loading && searchResults.length > 0 && (
              <View className="gap-2 mb-5">
                <Text
                  className="text-xs font-dmsans uppercase tracking-widest text-neutral-500 mb-1"
                  style={{ color: colors.textMuted }}
                >
                  Results
                </Text>
                {searchResults.map((item) => {
                  const alreadyAdded = selectedItems.some(
                    (i) => i.foodId === item.foodId,
                  );
                  return (
                    <Button
                      key={item.foodId}
                      onPress={() => handleAddItem(item)}
                      disabled={alreadyAdded}
                      variant="outline"
                      className={`mt-0 rounded-2xl px-4 py-3 ${
                        alreadyAdded ? "opacity-40" : "bg-white"
                      }`}
                    >
                      <Text
                        className="font-dmsans-bold text-base text-black"
                        style={{ color: colors.text }}
                      >
                        {item.foodName}
                      </Text>
                      <Text
                        className="font-dmsans text-xs text-neutral-500 mt-0.5"
                        style={{ color: colors.textMuted }}
                      >
                        {item.calories} kcal · P {item.proteinGrams}g · C{" "}
                        {item.carbsGrams}g · F {item.fatGrams}g
                      </Text>
                    </Button>
                  );
                })}
              </View>
            )}

            {/* Divider */}
            {selectedItems.length > 0 && (
              <View
                className="w-full h-px border border-neutral-200 rounded-xl mb-4"
                style={{ borderColor: colors.borderMuted }}
              />
            )}

            {/* Selected items */}
            {selectedItems.length > 0 && (
              <View className="gap-2 mb-6">
                <Text
                  className="text-xs font-dmsans uppercase tracking-widest text-neutral-500 mb-1"
                  style={{ color: colors.textMuted }}
                >
                  Selected ({selectedItems.length})
                </Text>
                {selectedItems.map((item) => (
                  <View
                    key={item.foodId}
                    className="border-2 border-black rounded-2xl px-4 py-3 flex-row items-center"
                    style={{ borderColor: colors.border }}
                  >
                    <View className="flex-1">
                      <Text
                        className="font-dmsans-bold text-base text-black"
                        style={{ color: colors.text }}
                      >
                        {item.foodName}
                      </Text>
                      <Text
                        className="font-dmsans text-xs text-neutral-500 mt-0.5"
                        style={{ color: colors.textMuted }}
                      >
                        {item.servingSize} · {item.calories} kcal · P{" "}
                        {item.proteinGrams}g · C {item.carbsGrams}g · F{" "}
                        {item.fatGrams}g
                      </Text>
                    </View>
                    <Button
                      onPress={() => handleRemoveItem(item.foodId)}
                      variant="outline"
                      size="icon"
                      className="ml-3 mt-0 rounded-full p-1"
                    >
                      <X size={14} color={colors.text} />
                    </Button>
                  </View>
                ))}
              </View>
            )}

            {/* Footer buttons */}
            <View className="flex-row gap-3">
              <Button
                onPress={handleClose}
                variant="outline"
                className="mt-0 flex-1 items-center py-3"
              >
                <Text
                  className="font-dmsans-bold text-black text-sm uppercase tracking-tight"
                  style={{ color: colors.text }}
                >
                  Cancel
                </Text>
              </Button>
              <Button
                onPress={handleSave}
                disabled={selectedItems.length === 0}
                className={`mt-0 flex-1 items-center rounded-full py-3 ${
                  selectedItems.length === 0 ? "opacity-40" : ""
                }`}
              >
                <Text className="font-dmsans-bold text-white text-sm uppercase tracking-tight">
                  Save to {selectedMeal}
                </Text>
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
