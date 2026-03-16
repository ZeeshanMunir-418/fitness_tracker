import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { nextStep, updateOnboardingData } from "@/store/slices/onboardingSlice";
import { Href, useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";

const genders = [
  { label: "Male", value: "male" as const },
  { label: "Female", value: "female" as const },
  { label: "Prefer not to say", value: "prefer_not_to_say" as const },
];

const StepOneScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const data = useAppSelector((s) => s.onboarding.data);

  const [heightText, setHeightText] = React.useState(
    data.height ? String(data.height) : "",
  );
  const [weightText, setWeightText] = React.useState(
    data.currentWeight ? String(data.currentWeight) : "",
  );

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
      onBack={() => router.back()}
      onNext={() => {
        dispatch(nextStep());
        router.push("/(onboarding)/step-2" as Href);
      }}
      nextDisabled={nextDisabled}
    >
      <View className="gap-4">
        <View className="gap-2">
          <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
            Full Name
          </Text>
          <TextInput
            className="rounded-full border-2 border-black px-5 py-4 font-dmsans text-base text-black"
            value={data.fullName}
            onChangeText={(value) =>
              dispatch(updateOnboardingData({ fullName: value }))
            }
            placeholder="Your full name"
            placeholderTextColor="#a3a3a3"
          />
        </View>

        <View className="gap-2">
          <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
            Age
          </Text>
          <TextInput
            className="rounded-full border-2 border-black px-5 py-4 font-dmsans text-base text-black"
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
            placeholderTextColor="#a3a3a3"
          />
        </View>

        <View className="gap-2">
          <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
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
                  className={`rounded-full px-4 py-3 ${
                    active ? "bg-black" : "border-2 border-black bg-white"
                  }`}
                >
                  <Text
                    className={`font-dmsans-bold text-sm ${
                      active ? "text-white" : "text-black"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
            Height
          </Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 rounded-full border-2 border-black px-5 py-4 font-dmsans text-base text-black"
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
              placeholderTextColor="#a3a3a3"
            />
            <View className="flex-row rounded-full border-2 border-black p-1">
              {(["cm", "ft"] as const).map((unit) => {
                const active = data.heightUnit === unit;
                return (
                  <Pressable
                    key={unit}
                    onPress={() =>
                      dispatch(updateOnboardingData({ heightUnit: unit }))
                    }
                    className={`rounded-full px-4 py-2 ${active ? "bg-black" : "bg-white"}`}
                  >
                    <Text
                      className={`font-dmsans-bold text-xs uppercase ${
                        active ? "text-white" : "text-black"
                      }`}
                    >
                      {unit}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View className="gap-2">
          <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
            Current Weight
          </Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 rounded-full border-2 border-black px-5 py-4 font-dmsans text-base text-black"
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
              placeholderTextColor="#a3a3a3"
            />
            <View className="flex-row rounded-full border-2 border-black p-1">
              {(["kg", "lbs"] as const).map((unit) => {
                const active = data.weightUnit === unit;
                return (
                  <Pressable
                    key={unit}
                    onPress={() =>
                      dispatch(updateOnboardingData({ weightUnit: unit }))
                    }
                    className={`rounded-full px-4 py-2 ${active ? "bg-black" : "bg-white"}`}
                  >
                    <Text
                      className={`font-dmsans-bold text-xs uppercase ${
                        active ? "text-white" : "text-black"
                      }`}
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
