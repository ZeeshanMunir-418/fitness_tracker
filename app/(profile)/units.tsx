import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useThemeStyles } from "@/lib/theme/useThemeStyles";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProfile, updateProfile } from "@/store/slices/profileSlice";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UnitsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useThemeStyles();
  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
  } = useAppSelector((s) => s.profile);

  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile && !profileLoading) {
      void dispatch(fetchProfile());
    }
  }, [dispatch, profile, profileLoading]);

  useEffect(() => {
    setWeightUnit(profile?.weight_unit === "lbs" ? "lbs" : "kg");
    setHeightUnit(profile?.height_unit === "ft" ? "ft" : "cm");
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await dispatch(
        updateProfile({
          weight_unit: weightUnit,
          height_unit: heightUnit,
        }),
      ).unwrap();

      console.log("[units] save success");
      router.back();
    } catch (saveError) {
      console.error("[units] save failed", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save units.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading && !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.text} />
          <Text
            style={[styles.textMuted, { marginTop: 12 }]}
            className="font-dmsans"
          >
            Loading units...
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
            No profile data
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 8, textAlign: "center" }]}
            className="font-dmsans"
          >
            {profileError}
          </Text>
          <Button
            onPress={() => void dispatch(fetchProfile())}
            className="mt-4"
            variant="outline"
          >
            <Text style={styles.text} className="font-dmsans-bold text-sm">
              Retry
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const renderPills = (
    values: readonly string[],
    selected: string,
    onSelect: (value: "kg" | "lbs" | "cm" | "ft") => void,
  ) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {values.map((value) => {
        const active = selected === value;
        return (
          <Pressable
            key={value}
            onPress={() => onSelect(value as "kg" | "lbs" | "cm" | "ft")}
            style={{
              paddingHorizontal: 16,
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
                fontSize: 13,
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
          Units
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
            Weight Unit
          </Text>
          {renderPills(["kg", "lbs"], weightUnit, (value) =>
            setWeightUnit(value as "kg" | "lbs"),
          )}
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Height Unit
          </Text>
          {renderPills(["cm", "ft"], heightUnit, (value) =>
            setHeightUnit(value as "cm" | "ft"),
          )}
        </View>

        <View
          style={[
            styles.card,
            { borderWidth: 2, borderRadius: 16, padding: 16 },
          ]}
        >
          <Text style={styles.textMuted} className="font-dmsans text-sm">
            Changing units does not convert existing values.
          </Text>
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
