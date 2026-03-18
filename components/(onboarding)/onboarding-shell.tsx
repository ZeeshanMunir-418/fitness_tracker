import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme/ThemeContext";
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
  const { colors } = useTheme();

  const progressPercent =
    `${Math.max(0, Math.min(100, (step / totalSteps) * 100))}%` as `${number}%`;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 24,
      }}
    >
      <View className="mt-2 flex-row items-center justify-between">
        <Button
          onPress={onBack}
          disabled={!onBack}
          variant="outline"
          size="icon"
          className="mt-0 h-10 w-10 items-center justify-center"
        >
          <ChevronLeft size={20} color={colors.text} strokeWidth={2.5} />
        </Button>
        <Text
          style={{ color: colors.textMuted }}
          className="font-dmsans text-sm"
        >
          {step} / {totalSteps}
        </Text>
      </View>

      {/* Progress bar */}
      <View
        style={{ borderColor: colors.border, borderWidth: 1 }}
        className="mt-4 h-1 overflow-hidden rounded-full"
      >
        <View
          style={{
            width: progressPercent,
            height: "100%",
            backgroundColor: colors.text,
          }}
        />
      </View>

      <Text
        style={{ color: colors.text }}
        className="mt-6 font-dmsans-bold text-3xl uppercase tracking-tight"
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{ color: colors.textMuted }}
          className="mt-2 font-dmsans text-sm leading-5"
        >
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
          style={{
            backgroundColor: nextDisabled ? colors.textFaint : colors.text,
          }}
          className="mt-0 w-full px-6 py-5"
        >
          <Text
            style={{ color: colors.background }}
            className="font-dmsans-bold text-[15px] tracking-[1.8px]"
          >
            {nextLabel}
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingShell;
