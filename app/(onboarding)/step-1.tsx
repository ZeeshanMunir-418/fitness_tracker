import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Input from "@/components/ui/input";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { nextStep, updateOnboardingData } from "@/store/slices/onboardingSlice";
import * as ImagePicker from "expo-image-picker";
import { Href, useRouter } from "expo-router";
import { User2 } from "lucide-react-native";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

const genders = [
  { label: "Male", value: "male" as const },
  { label: "Female", value: "female" as const },
  { label: "Prefer not to say", value: "prefer_not_to_say" as const },
];

const StepOneScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const data = useAppSelector((s) => s.onboarding.data);

  const [heightText, setHeightText] = useState(
    data.height ? String(data.height) : "",
  );
  const [weightText, setWeightText] = useState(
    data.currentWeight ? String(data.currentWeight) : "",
  );
  const [pickingAvatar, setPickingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    try {
      setPickingAvatar(true);
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        dispatch(updateOnboardingData({ avatarUri: result.assets[0].uri }));
      }
    } finally {
      setPickingAvatar(false);
    }
  };

  const nextDisabled =
    !data.fullName.trim() ||
    !data.age ||
    !data.gender ||
    !data.height ||
    !data.currentWeight;

  return (
    <OnboardingShell
      step={1}
      totalSteps={8}
      title="Personal Info"
      subtitle="Tell us about yourself so we can personalize your plan."
      onNext={() => {
        dispatch(nextStep());
        router.push("/(onboarding)/step-2" as Href);
      }}
      nextDisabled={nextDisabled}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ gap: 20 }}>
          {/* ── Avatar ──────────────────────────────────────────────────── */}
          <View style={{ gap: 12 }}>
            <Text
              style={{ color: colors.textMuted }}
              className="font-dmsans text-xs uppercase tracking-widest"
            >
              Profile Photo (Optional)
            </Text>
            <View className="flex-row items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage source={{ uri: data.avatarUri ?? undefined }} />
                <AvatarFallback style={{ backgroundColor: colors.card }}>
                  <User2 size={28} color={colors.textMuted} />
                </AvatarFallback>
              </Avatar>
              <View className="flex-1 flex-row gap-2">
                <Pressable
                  onPress={handlePickAvatar}
                  disabled={pickingAvatar}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: colors.text }}
                    className="font-dmsans-bold text-xs uppercase tracking-widest"
                  >
                    Upload
                  </Text>
                </Pressable>
                {data.avatarUri ? (
                  <Pressable
                    onPress={() =>
                      dispatch(updateOnboardingData({ avatarUri: null }))
                    }
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 999,
                      borderWidth: 2,
                      borderColor: colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{ color: colors.text }}
                      className="font-dmsans-bold text-xs uppercase tracking-widest"
                    >
                      Remove
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          {/* ── Full Name ────────────────────────────────────────────────── */}
          <View style={{ gap: 8 }}>
            <Text
              style={{ color: colors.textMuted }}
              className="font-dmsans text-xs uppercase tracking-widest"
            >
              Full Name
            </Text>
            <Input
              value={data.fullName}
              onChangeText={(value) =>
                dispatch(updateOnboardingData({ fullName: value }))
              }
              placeholder="Your full name"
            />
          </View>

          {/* ── Age ─────────────────────────────────────────────────────── */}
          <View style={{ gap: 8 }}>
            <Text
              style={{ color: colors.textMuted }}
              className="font-dmsans text-xs uppercase tracking-widest"
            >
              Age
            </Text>
            <Input
              value={data.age ? String(data.age) : ""}
              onChangeText={(value) =>
                dispatch(
                  updateOnboardingData({
                    age: value ? Number(value.replace(/[^0-9]/g, "")) : null,
                  }),
                )
              }
              keyboardType="number-pad"
              placeholder="Enter age"
            />
          </View>

          {/* ── Gender ──────────────────────────────────────────────────── */}
          <View style={{ gap: 8 }}>
            <Text
              style={{ color: colors.textMuted }}
              className="font-dmsans text-xs uppercase tracking-widest"
            >
              Gender
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {genders.map((option) => {
                const active = data.gender === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      dispatch(updateOnboardingData({ gender: option.value }))
                    }
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
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
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Height ──────────────────────────────────────────────────── */}
          <View style={{ gap: 8 }}>
            <Text
              style={{ color: colors.textMuted }}
              className="font-dmsans text-xs uppercase tracking-widest"
            >
              Height
            </Text>
            <View className="flex-row items-center gap-2">
              <Input
                containerClassName="flex-1"
                value={heightText}
                onChangeText={(value) => {
                  const sanitized = value.replace(/[^0-9.]/g, "");
                  setHeightText(sanitized);
                  const parsed = sanitized ? parseFloat(sanitized) : null;
                  dispatch(
                    updateOnboardingData({
                      height: parsed !== null && !isNaN(parsed) ? parsed : null,
                    }),
                  );
                }}
                keyboardType="decimal-pad"
                placeholder="Height"
              />
              {/* Unit toggle */}
              <View
                style={{
                  flexDirection: "row",
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: colors.border,
                  padding: 4,
                }}
              >
                {(["cm", "ft"] as const).map((unit) => {
                  const active = data.heightUnit === unit;
                  return (
                    <Pressable
                      key={unit}
                      onPress={() =>
                        dispatch(updateOnboardingData({ heightUnit: unit }))
                      }
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 999,
                        backgroundColor: active ? colors.text : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          color: active ? colors.background : colors.text,
                          fontSize: 12,
                        }}
                        className="font-dmsans-bold uppercase"
                      >
                        {unit}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ── Current Weight ───────────────────────────────────────────── */}
          <View style={{ gap: 8 }}>
            <Text
              style={{ color: colors.textMuted }}
              className="font-dmsans text-xs uppercase tracking-widest"
            >
              Current Weight
            </Text>
            <View className="flex-row items-center gap-2">
              <Input
                containerClassName="flex-1"
                value={weightText}
                onChangeText={(value) => {
                  const sanitized = value.replace(/[^0-9.]/g, "");
                  setWeightText(sanitized);
                  const parsed = sanitized ? parseFloat(sanitized) : null;
                  dispatch(
                    updateOnboardingData({
                      currentWeight:
                        parsed !== null && !isNaN(parsed) ? parsed : null,
                    }),
                  );
                }}
                keyboardType="decimal-pad"
                placeholder="Weight"
              />
              {/* Unit toggle */}
              <View
                style={{
                  flexDirection: "row",
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: colors.border,
                  padding: 4,
                }}
              >
                {(["kg", "lbs"] as const).map((unit) => {
                  const active = data.weightUnit === unit;
                  return (
                    <Pressable
                      key={unit}
                      onPress={() =>
                        dispatch(updateOnboardingData({ weightUnit: unit }))
                      }
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 999,
                        backgroundColor: active ? colors.text : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          color: active ? colors.background : colors.text,
                          fontSize: 12,
                        }}
                        className="font-dmsans-bold uppercase"
                      >
                        {unit}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </OnboardingShell>
  );
};

export default StepOneScreen;
