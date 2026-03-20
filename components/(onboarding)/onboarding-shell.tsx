import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme/ThemeContext";
import { ChevronLeft } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  const scrollRef = useRef<ScrollView>(null);
  // Measured from the footer's onLayout — ensures the last input always
  // scrolls above the Continue button regardless of screen size or font scale.
  const [footerHeight, setFooterHeight] = useState(80);

  const progressPercent =
    `${Math.max(0, Math.min(100, (step / totalSteps) * 100))}%` as `${number}%`;

  // Called from any TextInput inside a child via onFocus prop.
  // Passes the input's Y position in the scroll view so we can scroll it
  // above the keyboard (roughly the bottom 45% of the screen).
  const handleInputFocus = (y: number) => {
    const keyboardClearanceThreshold = SCREEN_HEIGHT * 0.45;
    if (y > keyboardClearanceThreshold) {
      scrollRef.current?.scrollTo({
        y: y - SCREEN_HEIGHT * 0.25, // land the field ~25% from the top
        animated: true,
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        {/* ── Fixed header (back button + step counter + progress bar + title) */}
        <View style={{ paddingHorizontal: 24 }}>
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
        </View>

        {/* ── Scrollable content ──────────────────────────────────────────── */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            // Always clears the fixed footer button + a little breathing room
            paddingBottom: footerHeight + 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScrollToTop={() =>
            scrollRef.current?.scrollTo({ y: 0, animated: true })
          }
        >
          <FocusAwareView onInputFocus={handleInputFocus}>
            {children}
          </FocusAwareView>
        </ScrollView>

        {/* ── Fixed footer button ─────────────────────────────────────────── */}
        <View
          style={{ paddingHorizontal: 24 }}
          className="pb-5 pt-3"
          // Measure the real rendered height (button + padding) so the
          // ScrollView's paddingBottom always clears it exactly.
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        >
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── FocusAwareView ─────────────────────────────────────────────────────────
// Wraps children and intercepts TextInput focus events via React's onFocus
// bubbling. When a TextInput inside gains focus, we measure its Y position
// relative to the ScrollView's coordinate space and call onInputFocus.

interface FocusAwareViewProps {
  children: React.ReactNode;
  onInputFocus: (y: number) => void;
}

const FocusAwareView = ({ children, onInputFocus }: FocusAwareViewProps) => {
  const containerRef = useRef<View>(null);

  const handleFocus = (e: any) => {
    const target = e.target;
    if (!target || !containerRef.current) return;

    target.measureLayout(
      containerRef.current,
      (_x: number, y: number, _w: number, h: number) => {
        // Pass the bottom edge so the whole input is visible.
        onInputFocus(y + h);
      },
      () => {
        // fallback: noop
      },
    );
  };

  return (
    <View ref={containerRef} onStartShouldSetResponder={() => false}>
      <View onFocus={handleFocus} accessible={false}>
        {children}
      </View>
    </View>
  );
};

export default OnboardingShell;
