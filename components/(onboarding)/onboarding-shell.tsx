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
  UIManager,
  View,
  findNodeHandle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { height: SCREEN_H } = Dimensions.get("window");

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
  const scrollViewNodeRef = useRef<number | null>(null);
  const [footerHeight, setFooterHeight] = useState(88);

  const progressPercent = Math.max(0, Math.min(100, (step / totalSteps) * 100));

  // Called by any TextInput's onFocus inside a child step.
  // We measure the focused input relative to the ScrollView and scroll it
  // into view above the keyboard, leaving ~20% breathing room at top.
  const handleInputFocus = (inputRef: React.RefObject<any>) => {
    if (!inputRef?.current || !scrollRef.current) return;

    const nodeHandle = findNodeHandle(scrollRef.current);
    if (!nodeHandle) return;

    // Small delay so the keyboard is already animating in before we measure
    setTimeout(() => {
      try {
        UIManager.measureLayout(
          findNodeHandle(inputRef.current)!,
          nodeHandle,
          () => {},
          (_x, y, _w, h) => {
            // Bottom of the input in scroll-view coords
            const inputBottom = y + h;
            // The visible area above the keyboard is roughly 55% of screen height
            const visibleAreaBottom = SCREEN_H * 0.55;

            if (inputBottom > visibleAreaBottom) {
              scrollRef.current?.scrollTo({
                // Land the input with ~20% padding from the top of the visible area
                y: y - SCREEN_H * 0.2,
                animated: true,
              });
            }
          },
        );
      } catch {
        // measureLayout can fail if the component unmounts mid-focus — ignore
      }
    }, 100);
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        {/* ── Fixed header ──────────────────────────────────────────────── */}
        <View className="px-6">
          {/* Back button + step counter */}
          <View className="mt-2 flex-row items-center justify-between">
            <Button
              onPress={onBack}
              disabled={!onBack}
              variant="outline"
              size="icon"
              className="h-10 w-10 items-center justify-center"
            >
              <ChevronLeft size={20} color={colors.text} strokeWidth={2.5} />
            </Button>
            <Text
              className="font-dmsans text-sm"
              style={{ color: colors.textMuted }}
            >
              {step} / {totalSteps}
            </Text>
          </View>

          {/* Progress bar */}
          <View
            className="mt-4 h-1.5 overflow-hidden rounded-full"
            style={{ borderColor: colors.border, borderWidth: 1 }}
          >
            <View
              className="h-full"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: colors.text,
              }}
            />
          </View>

          {/* Title */}
          <Text
            className="mt-6 font-dmsans-bold text-3xl uppercase tracking-tight"
            style={{ color: colors.text }}
          >
            {title}
          </Text>

          {/* Subtitle */}
          {subtitle ? (
            <Text
              className="mt-2 font-dmsans text-sm leading-5"
              style={{ color: colors.textMuted }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* ── Scrollable content ────────────────────────────────────────── */}
        {/*
          We pass onInputFocus down via React.cloneElement so child steps
          can call it from any TextInput's onFocus without needing a Context.
          Steps that have NO inputs simply ignore the prop — no extra wiring needed.
        */}
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            // Always clears the fixed footer regardless of screen size
            paddingBottom: footerHeight + 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          // Allows the scroll view to scroll to top when the status bar is tapped
          scrollsToTop
        >
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child;
            // Inject the focus handler — steps that don't use it just ignore it
            return React.cloneElement(child as React.ReactElement<any>, {
              onInputFocus: handleInputFocus,
            });
          })}
        </ScrollView>

        {/* ── Fixed footer ──────────────────────────────────────────────── */}
        <View
          className="px-6 pb-5 pt-3"
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        >
          <Button
            onPress={onNext}
            disabled={nextDisabled}
            style={{
              backgroundColor: nextDisabled ? colors.textFaint : colors.text,
            }}
            className="w-full px-6 py-5"
          >
            <Text
              className="font-dmsans-bold text-[15px] tracking-[1.8px]"
              style={{ color: colors.background }}
            >
              {nextLabel}
            </Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default OnboardingShell;
