import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Input from "@/components/ui/input";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { nextStep, updateOnboardingData } from "@/store/slices/onboardingSlice";
import * as ImagePicker from "expo-image-picker";
import { Href, useRouter } from "expo-router";
import { User2 } from "lucide-react-native";
import React, { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

const genders = [
  { label: "Male", value: "male" as const },
  { label: "Female", value: "female" as const },
  { label: "Prefer not to say", value: "prefer_not_to_say" as const },
];

interface StepOneProps {
  // Injected by OnboardingShell — scroll the given input ref into view
  onInputFocus?: (ref: React.RefObject<any>) => void;
}

const StepOneScreen = ({ onInputFocus }: StepOneProps) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const data = useAppSelector((s) => s.onboarding.data);

  // One ref per TextInput so the shell can measure each individually
  const nameRef = useRef<any>(null);
  const ageRef = useRef<any>(null);
  const heightRef = useRef<any>(null);
  const weightRef = useRef<any>(null);

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
      <View className="gap-5">
        {/* ── Avatar ──────────────────────────────────────────────────── */}
        <View className="gap-3">
          <Text
            className="font-dmsans text-xs uppercase tracking-widest"
            style={{ color: colors.textMuted }}
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
                className="flex-1 items-center justify-center rounded-full border-2 px-4 py-3"
                style={{ borderColor: colors.border }}
              >
                <Text
                  className="font-dmsans-bold text-xs uppercase tracking-widest"
                  style={{ color: colors.text }}
                >
                  Upload
                </Text>
              </Pressable>
              {data.avatarUri ? (
                <Pressable
                  onPress={() =>
                    dispatch(updateOnboardingData({ avatarUri: null }))
                  }
                  className="flex-1 items-center justify-center rounded-full border-2 px-4 py-3"
                  style={{ borderColor: colors.border }}
                >
                  <Text
                    className="font-dmsans-bold text-xs uppercase tracking-widest"
                    style={{ color: colors.text }}
                  >
                    Remove
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Full Name ────────────────────────────────────────────────── */}
        <View className="gap-2">
          <Text
            className="font-dmsans text-xs uppercase tracking-widest"
            style={{ color: colors.textMuted }}
          >
            Full Name
          </Text>
          <Input
            ref={nameRef}
            value={data.fullName}
            onChangeText={(v) =>
              dispatch(updateOnboardingData({ fullName: v }))
            }
            onFocus={() => onInputFocus?.(nameRef)}
            placeholder="Your full name"
          />
        </View>

        {/* ── Age ─────────────────────────────────────────────────────── */}
        <View className="gap-2">
          <Text
            className="font-dmsans text-xs uppercase tracking-widest"
            style={{ color: colors.textMuted }}
          >
            Age
          </Text>
          <Input
            ref={ageRef}
            value={data.age ? String(data.age) : ""}
            onChangeText={(v) =>
              dispatch(
                updateOnboardingData({
                  age: v ? Number(v.replace(/[^0-9]/g, "")) : null,
                }),
              )
            }
            onFocus={() => onInputFocus?.(ageRef)}
            keyboardType="number-pad"
            placeholder="Enter age"
          />
        </View>

        {/* ── Gender ──────────────────────────────────────────────────── */}
        <View className="gap-2">
          <Text
            className="font-dmsans text-xs uppercase tracking-widest"
            style={{ color: colors.textMuted }}
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
                  className="rounded-full border-2 px-4 py-3"
                  style={{
                    borderColor: active ? colors.border : colors.borderMuted,
                    backgroundColor: active ? colors.text : "transparent",
                  }}
                >
                  <Text
                    className="font-dmsans-bold text-[13px]"
                    style={{ color: active ? colors.background : colors.text }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Height ──────────────────────────────────────────────────── */}
        <View className="gap-2">
          <Text
            className="font-dmsans text-xs uppercase tracking-widest"
            style={{ color: colors.textMuted }}
          >
            Height
          </Text>
          <View className="flex-row items-center gap-2">
            <Input
              ref={heightRef}
              containerClassName="flex-1"
              value={heightText}
              onChangeText={(v) => {
                const s = v.replace(/[^0-9.]/g, "");
                setHeightText(s);
                const n = s ? parseFloat(s) : null;
                dispatch(
                  updateOnboardingData({
                    height: n !== null && !isNaN(n) ? n : null,
                  }),
                );
              }}
              onFocus={() => onInputFocus?.(heightRef)}
              keyboardType="decimal-pad"
              placeholder="Height"
            />
            {/* Unit toggle */}
            <View
              className="flex-row rounded-full border-2 p-1"
              style={{ borderColor: colors.border }}
            >
              {(["cm", "ft"] as const).map((unit) => {
                const active = data.heightUnit === unit;
                return (
                  <Pressable
                    key={unit}
                    onPress={() =>
                      dispatch(updateOnboardingData({ heightUnit: unit }))
                    }
                    className="rounded-full px-3.5 py-2.5"
                    style={{
                      backgroundColor: active ? colors.text : "transparent",
                    }}
                  >
                    <Text
                      className="font-dmsans-bold text-xs uppercase"
                      style={{
                        color: active ? colors.background : colors.text,
                      }}
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
        <View className="gap-2">
          <Text
            className="font-dmsans text-xs uppercase tracking-widest"
            style={{ color: colors.textMuted }}
          >
            Current Weight
          </Text>
          <View className="flex-row items-center gap-2">
            <Input
              ref={weightRef}
              containerClassName="flex-1"
              value={weightText}
              onChangeText={(v) => {
                const s = v.replace(/[^0-9.]/g, "");
                setWeightText(s);
                const n = s ? parseFloat(s) : null;
                dispatch(
                  updateOnboardingData({
                    currentWeight: n !== null && !isNaN(n) ? n : null,
                  }),
                );
              }}
              onFocus={() => onInputFocus?.(weightRef)}
              keyboardType="decimal-pad"
              placeholder="Weight"
            />
            {/* Unit toggle */}
            <View
              className="flex-row rounded-full border-2 p-1"
              style={{ borderColor: colors.border }}
            >
              {(["kg", "lbs"] as const).map((unit) => {
                const active = data.weightUnit === unit;
                return (
                  <Pressable
                    key={unit}
                    onPress={() =>
                      dispatch(updateOnboardingData({ weightUnit: unit }))
                    }
                    className="rounded-full px-3.5 py-2.5"
                    style={{
                      backgroundColor: active ? colors.text : "transparent",
                    }}
                  >
                    <Text
                      className="font-dmsans-bold text-xs uppercase"
                      style={{
                        color: active ? colors.background : colors.text,
                      }}
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
    </OnboardingShell>
  );
};

export default StepOneScreen;
