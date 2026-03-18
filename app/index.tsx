import { useTheme } from "@/lib/theme/ThemeContext";
import { Link, Stack } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import React from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const dots = Array.from({ length: 96 }, (_, i) => i);

const LandingScreen = () => {
  const { colors, isDark } = useTheme();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView
        className="flex-1 bg-[#F5F5F5]"
        style={{ backgroundColor: isDark ? colors.background : "#F5F5F5" }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          className="flex-1"
        >
          <View
            className="flex-1 overflow-hidden backdrop:bg-[#F5F5F5]"
            style={{ backgroundColor: isDark ? colors.background : "#F5F5F5" }}
          >
            <View className="pointer-events-none absolute inset-0 flex-row flex-wrap px-4 pt-4">
              {dots.map((dot) => (
                <View key={dot} className="w-1/6 items-center py-3">
                  <View
                    className="h-1 w-1 rounded-full bg-black/10"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.18)"
                        : "rgba(0,0,0,0.1)",
                    }}
                  />
                </View>
              ))}
            </View>

            <View className="px-6 pb-0 pt-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-6">
                  <View className="size-10 items-center justify-center aspect-square">
                    <Image
                      source={require("@/assets/images/logo.png")}
                      className="size-24"
                      resizeMode="contain"
                    />
                  </View>
                  <Text
                    className="font-dmsans-bold text-3xl text-black"
                    style={{ color: colors.text }}
                  >
                    APEX
                  </Text>
                </View>
              </View>

              <View className="mt-10">
                <Text
                  className="font-dmsans-bold text-[56px] leading-[52px] tracking-tight text-black"
                  style={{ color: colors.text }}
                >
                  TRAIN
                </Text>
                <Text
                  className="font-dmsans-bold text-[56px] leading-[52px] tracking-tight text-black"
                  style={{ color: colors.text }}
                >
                  LIKE A
                </Text>
                <Text
                  className="font-dmsans-bold text-[56px] leading-[52px] tracking-tight text-black"
                  style={{ color: colors.text }}
                >
                  GHOST.
                </Text>

                <View className="mt-6 max-w-[320px] flex-row">
                  <View
                    className="mr-4 mt-1 h-14 w-1 bg-black"
                    style={{ backgroundColor: colors.border }}
                  />
                  <Text
                    className="flex-1 font-dmsans-bold text-[18px] leading-7 text-neutral-500"
                    style={{ color: colors.textMuted }}
                  >
                    Track workouts, nutrition, and progress — all in one place.
                  </Text>
                </View>
              </View>

              <View className="relative mt-8 min-h-[300px] items-center justify-end overflow-hidden">
                <View className="absolute left-2 top-24 h-2 w-10 rounded-full bg-black/15" />
                <View className="absolute left-8 top-32 h-2 w-5 rounded-full bg-black/15" />
                <View className="absolute left-0 top-40 h-2 w-7 rounded-full bg-black/15" />

                <View className="absolute right-3 top-24 h-2 w-8 rounded-full bg-black/15" />
                <View className="absolute right-8 top-34 h-2 w-5 rounded-full bg-black/15" />
                <View className="absolute right-0 top-44 h-2 w-10 rounded-full bg-black/15" />

                <Image
                  source={require("@/assets/images/mascot-running.png")}
                  className="h-[300px] w-[300px]"
                  resizeMode="contain"
                />
              </View>
            </View>

            <View
              className="mt-auto border-t-2 border-black bg-white px-6 pb-8 pt-4"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.inputBg,
              }}
            >
              <Link href="/(auth)/register" asChild>
                <Pressable className="relative items-center rounded-full bg-black px-6 py-5">
                  <View className="absolute left-3 right-3 top-2 h-1/2 rounded-full bg-white/10" />
                  <View className="flex-row items-center gap-3">
                    <Text className="font-dmsans-bold text-[16px] tracking-[2px] text-white">
                      GET STARTED
                    </Text>
                    <ArrowRight size={20} color="#FFFFFF" strokeWidth={3} />
                  </View>
                </Pressable>
              </Link>

              <Link href="/(auth)/login" asChild>
                <Pressable className="mt-4 items-center rounded-full border-2 border-black bg-white px-6 py-5">
                  <Text
                    className="font-dmsans-bold text-[15px] tracking-[1.5px] text-black"
                    style={{ color: colors.text }}
                  >
                    I ALREADY HAVE AN ACCOUNT
                  </Text>
                </Pressable>
              </Link>

              <Text
                className="mt-5 text-center font-dmsans-bold text-xs tracking-[2px] text-neutral-400"
                style={{ color: colors.textFaint }}
              >
                FREE TO START. NO CREDIT CARD REQUIRED.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

export default LandingScreen;
