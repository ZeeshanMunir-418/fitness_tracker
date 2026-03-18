import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useThemeStyles } from "@/lib/theme/useThemeStyles";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProfile, updateProfile } from "@/store/slices/profileSlice";
import DateTimePicker, {
    type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { ArrowLeft, CalendarDays } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HealthDataScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useThemeStyles();

  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
  } = useAppSelector((s) => s.profile);

  const [currentWeight, setCurrentWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [height, setHeight] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weeklyWeightChangeKg, setWeeklyWeightChangeKg] = useState("");
  const [dailyWaterGoalLiters, setDailyWaterGoalLiters] = useState("");
  const [tracksCalories, setTracksCalories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile && !profileLoading) {
      void dispatch(fetchProfile());
    }
  }, [dispatch, profile, profileLoading]);

  useEffect(() => {
    setCurrentWeight(
      profile?.current_weight != null ? String(profile.current_weight) : "",
    );
    setWeightUnit(profile?.weight_unit === "lbs" ? "lbs" : "kg");
    setHeight(profile?.height != null ? String(profile.height) : "");
    setHeightUnit(profile?.height_unit === "ft" ? "ft" : "cm");
    setTargetWeight(
      profile?.target_weight != null ? String(profile.target_weight) : "",
    );
    setTargetDate(profile?.target_date ? new Date(profile.target_date) : null);
    setWeeklyWeightChangeKg(
      profile?.weekly_weight_change_kg != null
        ? String(profile.weekly_weight_change_kg)
        : "",
    );
    setDailyWaterGoalLiters(
      profile?.daily_water_goal_liters != null
        ? String(profile.daily_water_goal_liters)
        : "",
    );
    setTracksCalories(Boolean(profile?.tracks_calories));
  }, [profile]);

  const bmiDisplay = useMemo(() => {
    if (profile?.bmi == null) return "--";
    return profile.bmi.toFixed(1);
  }, [profile?.bmi]);

  const bmrDisplay = useMemo(() => {
    if (profile?.bmr == null) return "--";
    return String(Math.round(profile.bmr));
  }, [profile?.bmr]);

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }

    if (event.type === "set" && selected) {
      setTargetDate(selected);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await dispatch(
        updateProfile({
          current_weight: currentWeight.trim() ? Number(currentWeight) : null,
          weight_unit: weightUnit,
          height: height.trim() ? Number(height) : null,
          height_unit: heightUnit,
          target_weight: targetWeight.trim() ? Number(targetWeight) : null,
          target_date: targetDate ? targetDate.toISOString() : null,
          weekly_weight_change_kg: weeklyWeightChangeKg.trim()
            ? Number(weeklyWeightChangeKg)
            : null,
          daily_water_goal_liters: dailyWaterGoalLiters.trim()
            ? Number(dailyWaterGoalLiters)
            : null,
          tracks_calories: tracksCalories,
        }),
      ).unwrap();

      await dispatch(fetchProfile()).unwrap();
      console.log("[healthData] save success");
      router.back();
    } catch (saveError) {
      console.error("[healthData] save failed", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save health data.",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderUnitToggle = (
    values: readonly string[],
    selected: string,
    onSelect: (value: "kg" | "lbs" | "cm" | "ft") => void,
  ) => (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {values.map((value) => {
        const active = selected === value;
        return (
          <Pressable
            key={value}
            onPress={() => onSelect(value as "kg" | "lbs" | "cm" | "ft")}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 999,
              borderWidth: 2,
              borderColor: active ? colors.border : colors.borderMuted,
              backgroundColor: active ? colors.text : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? colors.background : colors.text,
                fontSize: 12,
              }}
              className="font-dmsans-bold"
            >
              {value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (profileLoading && !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.text} />
          <Text
            style={[styles.textMuted, { marginTop: 12 }]}
            className="font-dmsans"
          >
            Loading health data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile && profileError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center px-6">
          <Text style={styles.text} className="font-dmsans-bold text-lg">
            Profile unavailable
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 8, textAlign: "center" }]}
            className="font-dmsans"
          >
            {profileError}
          </Text>
          <Button
            onPress={() => void dispatch(fetchProfile())}
            variant="outline"
            className="mt-4"
          >
            <Text style={styles.text} className="font-dmsans-bold text-sm">
              Retry
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 16,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text
          style={[styles.text, { fontSize: 22 }]}
          className="font-dmsans-bold"
        >
          Health Data
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Current Weight
          </Text>
          <View className="flex-row gap-2">
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  borderWidth: 2,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: colors.text,
                },
              ]}
              placeholderTextColor={colors.textFaint}
              className="font-dmsans"
              value={currentWeight}
              onChangeText={setCurrentWeight}
              keyboardType="decimal-pad"
              placeholder="Enter weight"
            />
            {renderUnitToggle(["kg", "lbs"], weightUnit, (value) =>
              setWeightUnit(value as "kg" | "lbs"),
            )}
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Height
          </Text>
          <View className="flex-row gap-2">
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  borderWidth: 2,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: colors.text,
                },
              ]}
              placeholderTextColor={colors.textFaint}
              className="font-dmsans"
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
              placeholder="Enter height"
            />
            {renderUnitToggle(["cm", "ft"], heightUnit, (value) =>
              setHeightUnit(value as "cm" | "ft"),
            )}
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Target Weight
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderWidth: 2,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: colors.text,
              },
            ]}
            placeholderTextColor={colors.textFaint}
            className="font-dmsans"
            value={targetWeight}
            onChangeText={setTargetWeight}
            keyboardType="decimal-pad"
            placeholder="Target weight"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Target Date
          </Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[
              styles.input,
              {
                borderWidth: 2,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
            ]}
          >
            <Text style={styles.text} className="font-dmsans">
              {targetDate ? targetDate.toDateString() : "Select target date"}
            </Text>
            <CalendarDays
              size={16}
              color={colors.textMuted}
              strokeWidth={1.5}
            />
          </Pressable>
          {showDatePicker ? (
            <DateTimePicker
              value={targetDate ?? new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
            />
          ) : null}
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Weekly change goal (kg)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderWidth: 2,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: colors.text,
              },
            ]}
            placeholderTextColor={colors.textFaint}
            className="font-dmsans"
            value={weeklyWeightChangeKg}
            onChangeText={setWeeklyWeightChangeKg}
            keyboardType="decimal-pad"
            placeholder="e.g. 0.5"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Daily Water Goal (liters)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderWidth: 2,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: colors.text,
              },
            ]}
            placeholderTextColor={colors.textFaint}
            className="font-dmsans"
            value={dailyWaterGoalLiters}
            onChangeText={setDailyWaterGoalLiters}
            keyboardType="decimal-pad"
            placeholder="e.g. 2.5"
          />
        </View>

        <View
          style={[
            styles.card,
            { borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 16 },
          ]}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text style={styles.text} className="font-dmsans-bold text-sm">
                Track Calories
              </Text>
              <Text
                style={styles.textMuted}
                className="font-dmsans text-xs mt-1"
              >
                Enable calorie-focused tracking throughout the app.
              </Text>
            </View>
            <Toggle value={tracksCalories} onValueChange={setTracksCalories} />
          </View>
        </View>

        <View
          style={[
            styles.card,
            { borderWidth: 2, borderRadius: 16, padding: 16 },
          ]}
        >
          <Text
            style={styles.textMuted}
            className="font-dmsans-bold text-xs uppercase tracking-widest mb-3"
          >
            Calculated Metrics
          </Text>
          <View className="flex-row gap-3">
            <View
              style={[
                styles.input,
                { borderWidth: 2, borderRadius: 14, padding: 12, flex: 1 },
              ]}
            >
              <Text style={styles.textMuted} className="font-dmsans text-xs">
                BMI
              </Text>
              <Text
                style={styles.text}
                className="font-dmsans-bold text-lg mt-1"
              >
                {bmiDisplay}
              </Text>
            </View>
            <View
              style={[
                styles.input,
                { borderWidth: 2, borderRadius: 14, padding: 12, flex: 1 },
              ]}
            >
              <Text style={styles.textMuted} className="font-dmsans text-xs">
                BMR
              </Text>
              <Text
                style={styles.text}
                className="font-dmsans-bold text-lg mt-1"
              >
                {bmrDisplay}
              </Text>
            </View>
          </View>
        </View>

        <Button onPress={handleSave} disabled={saving} className="w-full mt-6">
          <Text
            style={{ color: colors.background }}
            className="font-dmsans-bold text-base"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </Button>

        {error ? (
          <Text
            style={[styles.textMuted, { fontSize: 13, marginTop: 8 }]}
            className="font-dmsans"
          >
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
