import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: React.ReactNode;
}

const OnboardingShell = ({
  step,
  totalSteps,
  title,
  subtitle,
  onNext,
  onBack,
  nextLabel = "CONTINUE",
  nextDisabled = false,
  children,
}: OnboardingShellProps) => {
  const progressPercent =
    `${Math.max(0, Math.min(100, (step / totalSteps) * 100))}%` as `${number}%`;

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <View className="mt-2 flex-row items-center justify-between">
        <Button
          onPress={onBack}
          disabled={!onBack}
          variant="outline"
          size="icon"
          className="mt-0 h-10 w-10 items-center justify-center"
        >
          <ChevronLeft size={20} color="#000" strokeWidth={2.5} />
        </Button>
        <Text className="font-dmsans text-sm text-neutral-500">
          {step} / {totalSteps}
        </Text>
      </View>

      <View className="mt-4 h-1 overflow-hidden rounded-full border border-black">
        <View className="h-full bg-black" style={{ width: progressPercent }} />
      </View>

      <Text className="mt-6 font-dmsans-bold text-3xl uppercase tracking-tight text-black">
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-2 font-dmsans text-sm leading-5 text-neutral-500">
          {subtitle}
        </Text>
      ) : null}

      <ScrollView
        className="mt-6 flex-1"
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <View className="pb-5 pt-3">
        <Button
          onPress={onNext}
          disabled={nextDisabled}
          className={`mt-0 w-full px-6 py-5 ${nextDisabled ? "bg-black/30" : "bg-black"}`}
        >
          <Text className="font-dmsans-bold text-[15px] tracking-[1.8px] text-white">
            {nextLabel}
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingShell;
