import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearResults,
  FoodItem,
  searchFood,
} from "@/store/slices/nutritionSlice";
import { X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
        <TouchableOpacity
          className="absolute inset-0 bg-black/40"
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* Sheet */}
        <View className="bg-white rounded-t-3xl border-t-2 border-x-2 border-black px-4 pt-5 pb-10 max-h-[92%]">
          {/* Handle */}
          <View className="w-12 h-1 rounded-full bg-neutral-300 self-center mb-5" />

          {/* Header */}
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-2xl font-dmsans-bold uppercase tracking-tight">
              Add Food
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              className="border-2 border-black rounded-full p-1"
            >
              <X size={20} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Meal selector */}
            <Text className="text-xs font-dmsans uppercase tracking-widest text-neutral-500 mb-2">
              Meal
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {MEAL_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setSelectedMeal(key)}
                  className={`px-4 py-2 rounded-full border-2 border-black ${
                    selectedMeal === key ? "bg-black" : "bg-white"
                  }`}
                >
                  <Text
                    className={`font-dmsans-bold text-sm uppercase tracking-tight ${
                      selectedMeal === key ? "text-white" : "text-black"
                    }`}
                  >
                    {key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="w-full h-px border border-neutral-200 rounded-xl mb-5" />

            {/* Search input */}
            <Text className="text-xs font-dmsans uppercase tracking-widest text-neutral-500 mb-2">
              Search Food
            </Text>
            <View className="flex-row gap-2 mb-4">
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                placeholder="e.g. chicken biryani"
                placeholderTextColor="#737373"
                className="flex-1 border-2 border-black rounded-full px-5 py-3 font-dmsans text-black text-base"
              />
              <TouchableOpacity
                onPress={handleSearch}
                activeOpacity={0.85}
                className="bg-black rounded-full px-5 py-3 justify-center overflow-hidden"
              >
                <View className="absolute inset-x-0 top-0 h-1/2 bg-white/10 rounded-t-full" />
                <Text className="font-dmsans-bold text-white text-sm uppercase tracking-tight">
                  Search
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error ? (
              <Text className="text-black font-dmsans text-sm mb-4 px-1">
                {error}
              </Text>
            ) : null}

            {/* Loading */}
            {loading ? (
              <View className="items-center py-6">
                <ActivityIndicator color="#000" size="small" />
              </View>
            ) : null}

            {/* Search results */}
            {!loading && searchResults.length > 0 && (
              <View className="gap-2 mb-5">
                <Text className="text-xs font-dmsans uppercase tracking-widest text-neutral-500 mb-1">
                  Results
                </Text>
                {searchResults.map((item) => {
                  const alreadyAdded = selectedItems.some(
                    (i) => i.foodId === item.foodId,
                  );
                  return (
                    <TouchableOpacity
                      key={item.foodId}
                      onPress={() => handleAddItem(item)}
                      activeOpacity={0.8}
                      disabled={alreadyAdded}
                      className={`border-2 border-black rounded-2xl px-4 py-3 ${
                        alreadyAdded ? "opacity-40" : "bg-white"
                      }`}
                    >
                      <Text className="font-dmsans-bold text-base text-black">
                        {item.foodName}
                      </Text>
                      <Text className="font-dmsans text-xs text-neutral-500 mt-0.5">
                        {item.calories} kcal · P {item.proteinGrams}g · C{" "}
                        {item.carbsGrams}g · F {item.fatGrams}g
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Divider */}
            {selectedItems.length > 0 && (
              <View className="w-full h-px border border-neutral-200 rounded-xl mb-4" />
            )}

            {/* Selected items */}
            {selectedItems.length > 0 && (
              <View className="gap-2 mb-6">
                <Text className="text-xs font-dmsans uppercase tracking-widest text-neutral-500 mb-1">
                  Selected ({selectedItems.length})
                </Text>
                {selectedItems.map((item) => (
                  <View
                    key={item.foodId}
                    className="border-2 border-black rounded-2xl px-4 py-3 flex-row items-center"
                  >
                    <View className="flex-1">
                      <Text className="font-dmsans-bold text-base text-black">
                        {item.foodName}
                      </Text>
                      <Text className="font-dmsans text-xs text-neutral-500 mt-0.5">
                        {item.servingSize} · {item.calories} kcal · P{" "}
                        {item.proteinGrams}g · C {item.carbsGrams}g · F{" "}
                        {item.fatGrams}g
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveItem(item.foodId)}
                      className="ml-3 border-2 border-black rounded-full p-1"
                    >
                      <X size={14} color="#000" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Footer buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleClose}
                className="flex-1 border-2 border-black rounded-full py-3 items-center"
              >
                <Text className="font-dmsans-bold text-black text-sm uppercase tracking-tight">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={selectedItems.length === 0}
                activeOpacity={0.85}
                className={`flex-1 bg-black rounded-full py-3 items-center overflow-hidden ${
                  selectedItems.length === 0 ? "opacity-40" : ""
                }`}
              >
                <View className="absolute inset-x-0 top-0 h-1/2 bg-white/10 rounded-t-full" />
                <Text className="font-dmsans-bold text-white text-sm uppercase tracking-tight">
                  Save to {selectedMeal}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
