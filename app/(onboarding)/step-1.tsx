import OnboardingShell from "@/components/(onboarding)/onboarding-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Input from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { nextStep, updateOnboardingData } from "@/store/slices/onboardingSlice";
import { cn } from "@/utils/cn";
import * as ImagePicker from "expo-image-picker";
import { Href, useRouter } from "expo-router";
import { User2 } from "lucide-react-native";
import React from "react";
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
  const data = useAppSelector((s) => s.onboarding.data);

  const [heightText, setHeightText] = React.useState(
    data.height ? String(data.height) : "",
  );
  const [weightText, setWeightText] = React.useState(
    data.currentWeight ? String(data.currentWeight) : "",
  );
  const [pickingAvatar, setPickingAvatar] = React.useState(false);

  const handlePickAvatar = async () => {
    try {
      setPickingAvatar(true);
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return;
      }

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
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="gap-4">
          <View className="gap-3">
            <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
              Profile Photo (Optional)
            </Text>
            <View className="flex-row items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage source={{ uri: data.avatarUri ?? undefined }} />
                <AvatarFallback className="bg-neutral-200">
                  <User2 className="h-8 w-8 text-neutral-500" />
                </AvatarFallback>
              </Avatar>
              <View className="flex-1 flex-row gap-2">
                <Pressable
                  className="mt-0 flex-1 px-4 py-3 rounded-full border-2 border-black items-center justify-center"
                  disabled={pickingAvatar}
                  onPress={handlePickAvatar}
                >
                  <Text className="font-dmsans-bold text-xs uppercase tracking-widest text-black">
                    Upload
                  </Text>
                </Pressable>
                {data.avatarUri ? (
                  <Pressable
                    className="mt-0 flex-1 px-4 py-3 rounded-full border-2 border-black items-center justify-center"
                    onPress={() =>
                      dispatch(updateOnboardingData({ avatarUri: null }))
                    }
                  >
                    <Text className="font-dmsans-bold text-xs uppercase tracking-widest text-black">
                      Remove
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          <View className="gap-2">
            <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
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

          <View className="gap-2">
            <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
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
                    className={cn(
                      "mt-0 px-4 py-3 rounded-full border-2 border-black",
                      {
                        "bg-black": active,
                        "bg-white": !active,
                      },
                    )}
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
              <View className="flex-row rounded-full border-2 border-black p-1">
                {(["cm", "ft"] as const).map((unit) => {
                  const active = data.heightUnit === unit;
                  return (
                    <Pressable
                      key={unit}
                      onPress={() =>
                        dispatch(updateOnboardingData({ heightUnit: unit }))
                      }
                      className={cn("mt-0 p-4 rounded-full", {
                        "bg-black": active,
                        "bg-white": !active,
                      })}
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
              <View className="flex-row rounded-full border-2 border-black p-1">
                {(["kg", "lbs"] as const).map((unit) => {
                  const active = data.weightUnit === unit;
                  return (
                    <Pressable
                      key={unit}
                      onPress={() =>
                        dispatch(updateOnboardingData({ weightUnit: unit }))
                      }
                      className={cn("mt-0 p-4 rounded-full", {
                        "bg-black": active,
                        "bg-white": !active,
                      })}
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
      </KeyboardAvoidingView>
    </OnboardingShell>
  );
};

export default StepOneScreen;
