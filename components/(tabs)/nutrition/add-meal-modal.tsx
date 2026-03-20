import Input from "@/components/ui/input";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearResults,
  type FoodItem,
  searchFood,
} from "@/store/slices/nutritionSlice";
import { cn } from "@/utils/cn";
import { CheckCircle2, Search, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

type MealKey = "breakfast" | "lunch" | "dinner" | "snacks";
const MEAL_KEYS: MealKey[] = ["breakfast", "lunch", "dinner", "snacks"];

interface AddMealModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (mealKey: MealKey, items: FoodItem[]) => void;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

// Fixed heights of the non-scrollable zones (handle + header + search + divider)
const FIXED_ZONE_HEIGHT = 180;
// Extra breathing room above keyboard
const KEYBOARD_PADDING = 16;

export const AddMealModal: React.FC<AddMealModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const { isDark } = useTheme();
  const dispatch = useAppDispatch();
  const searchResults = useAppSelector((s) => s.nutrition.searchResults);
  const searchLoading = useAppSelector((s) => s.nutrition.loading);
  const searchError = useAppSelector((s) => s.nutrition.error);

  const [selectedMeal, setSelectedMeal] = useState<MealKey>("breakfast");
  const [query, setQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<FoodItem[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ── Track keyboard height manually ────────────────────────────────────────
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── Derive scroll area height ──────────────────────────────────────────────
  // Available height = screen - keyboard - fixed zone - padding
  const availableHeight =
    keyboardHeight > 0
      ? SCREEN_HEIGHT - keyboardHeight - FIXED_ZONE_HEIGHT - KEYBOARD_PADDING
      : SCREEN_HEIGHT * 0.45; // default ~45% of screen when keyboard closed

  const handleSearch = () => {
    if (query.trim()) dispatch(searchFood(query.trim()));
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
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={handleClose}
        />

        {/* Sheet — positioned at bottom, moves up by keyboard height on Android */}
        <View
          style={{
            marginBottom: Platform.OS === "android" ? keyboardHeight : 0,
          }}
          className={cn(
            "rounded-t-3xl border-t-2 border-x-2",
            isDark ? "bg-black border-white/20" : "bg-white border-black/10",
          )}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View
              className={cn(
                "w-10 h-1 rounded-full",
                isDark ? "bg-white/20" : "bg-black/15",
              )}
            />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
            <Text
              className={cn(
                "font-dmsans-bold text-2xl uppercase tracking-tight",
                isDark ? "text-white" : "text-black",
              )}
            >
              Add Food
            </Text>
            <Pressable
              onPress={handleClose}
              className={cn(
                "w-9 h-9 rounded-full border-2 items-center justify-center",
                isDark ? "border-white/20" : "border-black/15",
              )}
            >
              <X
                size={16}
                color={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                strokeWidth={1.5}
              />
            </Pressable>
          </View>

          {/* ── Search bar — always visible, outside ScrollView ────────────
              Sits in the fixed zone. Never scrolls away.
              On Android the whole sheet shifts up via marginBottom.
          ──────────────────────────────────────────────────────────── */}
          <View className="px-4 pb-3">
            <Text
              className={cn(
                "font-dmsans text-[10px] uppercase tracking-widest mb-2",
                isDark ? "text-white/40" : "text-black/40",
              )}
            >
              Search Food
            </Text>
            <View className="flex-row gap-2">
              <Input
                containerClassName="flex-1"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                placeholder="e.g. boiled eggs, grilled chicken"
                autoCorrect={false}
                autoCapitalize="none"
              />
              <Pressable
                onPress={handleSearch}
                disabled={searchLoading}
                className={cn(
                  "p-4 w-16 rounded-full items-center justify-center",
                  isDark ? "bg-white" : "bg-black",
                  searchLoading && "opacity-50",
                )}
              >
                {searchLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={isDark ? "#000" : "#fff"}
                  />
                ) : (
                  <Search
                    size={18}
                    color={isDark ? "#000" : "#fff"}
                    strokeWidth={2}
                  />
                )}
              </Pressable>
            </View>
          </View>

          {/* Divider */}
          <View
            className={cn(
              "h-px mx-4 mb-1",
              isDark ? "bg-white/10" : "bg-black/8",
            )}
          />

          {/* ── Scrollable zone — height controlled by Dimensions ──────────
              When keyboard is open: exactly fills space between search bar
              and top of keyboard. When closed: 45% of screen height.
          ──────────────────────────────────────────────────────────── */}
          <ScrollView
            style={{ height: availableHeight }}
            contentContainerStyle={{ padding: 16, paddingBottom: 64 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Meal selector */}
            <Text
              className={cn(
                "font-dmsans text-[10px] uppercase tracking-widest mb-2",
                isDark ? "text-white/40" : "text-black/40",
              )}
            >
              Meal
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {MEAL_KEYS.map((key) => {
                const active = selectedMeal === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedMeal(key)}
                    className={cn(
                      "px-4 py-2 rounded-full border-2",
                      active
                        ? isDark
                          ? "bg-white border-white"
                          : "bg-black border-black"
                        : isDark
                          ? "border-white/20"
                          : "border-black/15",
                    )}
                  >
                    <Text
                      className={cn(
                        "font-dmsans-bold text-xs uppercase tracking-widest",
                        active
                          ? isDark
                            ? "text-black"
                            : "text-white"
                          : isDark
                            ? "text-white/60"
                            : "text-black/60",
                      )}
                    >
                      {key}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              className={cn(
                "h-px w-full rounded-full mb-4",
                isDark ? "bg-white/10" : "bg-black/8",
              )}
            />
            {/* Selected items */}
            {selectedItems.length > 0 && (
              <>
                <View
                  className={cn(
                    "h-px w-full rounded-full mb-4",
                    isDark ? "bg-white/10" : "bg-black/8",
                  )}
                />
                <Text
                  className={cn(
                    "font-dmsans text-[10px] uppercase tracking-widest mb-2",
                    isDark ? "text-white/40" : "text-black/40",
                  )}
                >
                  Selected ({selectedItems.length})
                </Text>
                <View className="gap-2 mb-4">
                  {selectedItems.map((item) => (
                    <View
                      key={item.foodId}
                      className={cn(
                        "border-2 rounded-2xl px-4 py-3 flex-row items-center",
                        isDark ? "border-white/25" : "border-black/15",
                      )}
                    >
                      <View className="flex-1 mr-3">
                        <Text
                          className={cn(
                            "font-dmsans-bold text-sm",
                            isDark ? "text-white" : "text-black",
                          )}
                          numberOfLines={1}
                        >
                          {item.foodName}
                        </Text>
                        <Text
                          className={cn(
                            "font-dmsans text-xs mt-0.5",
                            isDark ? "text-white/40" : "text-black/40",
                          )}
                        >
                          {item.servingSize} · {item.calories} kcal · P{" "}
                          {item.proteinGrams}g · C {item.carbsGrams}g · F{" "}
                          {item.fatGrams}g
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleRemoveItem(item.foodId)}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 items-center justify-center",
                          isDark ? "border-white/20" : "border-black/15",
                        )}
                      >
                        <X
                          size={13}
                          color={
                            isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"
                          }
                          strokeWidth={1.5}
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Search error */}
            {searchError ? (
              <Text
                className={cn(
                  "font-dmsans text-sm mb-3",
                  isDark ? "text-white/50" : "text-black/50",
                )}
              >
                {searchError}
              </Text>
            ) : null}

            {/* Results */}
            {!searchLoading && searchResults.length > 0 && (
              <View className="gap-2 mb-4">
                <Text
                  className={cn(
                    "font-dmsans text-[10px] uppercase tracking-widest mb-1",
                    isDark ? "text-white/40" : "text-black/40",
                  )}
                >
                  Results
                </Text>
                {searchResults.map((item) => {
                  const alreadyAdded = selectedItems.some(
                    (i) => i.foodId === item.foodId,
                  );
                  return (
                    <Pressable
                      key={item.foodId}
                      onPress={() => !alreadyAdded && handleAddItem(item)}
                      className={cn(
                        "border-2 rounded-2xl px-4 py-3 flex-row items-center justify-between",
                        alreadyAdded ? "opacity-40" : "opacity-100",
                        isDark
                          ? "border-white/20 bg-white/5"
                          : "border-black/10 bg-black/[0.02]",
                      )}
                    >
                      <View className="flex-1 mr-3">
                        <Text
                          className={cn(
                            "font-dmsans-bold text-sm",
                            isDark ? "text-white" : "text-black",
                          )}
                          numberOfLines={1}
                        >
                          {item.foodName}
                        </Text>
                        <Text
                          className={cn(
                            "font-dmsans text-xs mt-0.5",
                            isDark ? "text-white/40" : "text-black/40",
                          )}
                        >
                          {item.servingSize} · {item.calories} kcal · P{" "}
                          {item.proteinGrams}g · C {item.carbsGrams}g · F{" "}
                          {item.fatGrams}g
                        </Text>
                      </View>
                      {alreadyAdded ? (
                        <CheckCircle2
                          size={18}
                          color={
                            isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"
                          }
                          strokeWidth={1.5}
                        />
                      ) : (
                        <View
                          className={cn(
                            "w-7 h-7 rounded-full items-center justify-center",
                            isDark ? "bg-white" : "bg-black",
                          )}
                        >
                          <Text
                            className={cn(
                              "font-dmsans-bold text-base leading-none",
                              isDark ? "text-black" : "text-white",
                            )}
                          >
                            +
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Footer buttons */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleClose}
                className={cn(
                  "flex-1 py-4 rounded-full border-2 items-center justify-center",
                  isDark ? "border-white/20" : "border-black/15",
                )}
              >
                <Text
                  className={cn(
                    "font-dmsans-bold text-xs uppercase tracking-widest",
                    isDark ? "text-white/60" : "text-black/60",
                  )}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={selectedItems.length === 0}
                className={cn(
                  "flex-1 py-4 rounded-full items-center justify-center",
                  isDark ? "bg-white" : "bg-black",
                  selectedItems.length === 0 && "opacity-30",
                )}
              >
                <Text
                  className={cn(
                    "font-dmsans-bold text-xs uppercase tracking-widest",
                    isDark ? "text-black" : "text-white",
                  )}
                >
                  Save to {selectedMeal}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
