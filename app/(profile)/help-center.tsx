import { useTheme } from "@/lib/theme/ThemeContext";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
    LayoutAnimation,
    Platform,
    Pressable,
    ScrollView,
    Text,
    UIManager,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_ITEMS = [
  {
    id: "calorie-target",
    question: "How is my calorie target calculated?",
    answer:
      "Your daily target is based on your estimated BMR multiplied by your activity level, then adjusted by your current fitness goal.",
  },
  {
    id: "update-plan",
    question: "How do I update my workout plan?",
    answer:
      "Workout plans are generated during onboarding. Profile changes update the next plan generation and future recommendations.",
  },
  {
    id: "switch-home-gym",
    question: "Can I switch between home and gym workouts?",
    answer:
      "Yes. Use the Home and Gym toggle in the workouts experience when both plans are available in your account.",
  },
  {
    id: "log-meal",
    question: "How do I log a meal?",
    answer:
      "Open the Nutrition tab, pick a meal type, and add foods. Calories and meal totals update after each entry.",
  },
  {
    id: "push-notifications",
    question: "How do push notifications work?",
    answer:
      "Workout and meal reminders come from your profile settings. You can enable or disable each reminder type at any time.",
  },
  {
    id: "steps-counted",
    question: "How are my steps counted?",
    answer:
      "Step tracking uses Expo Sensors Pedometer with background tracking support when permissions are granted on your device.",
  },
];

function FaqItem({
  question,
  answer,
  expanded,
  onToggle,
}: {
  question: string;
  answer: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
        borderWidth: 2,
        borderRadius: 16,
        marginBottom: 10,
        overflow: "hidden",
      }}
    >
      {/* Question row */}
      <Pressable
        onPress={onToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}
      >
        <Text
          style={{
            color: colors.text,
            flex: 1,
            marginRight: 12,
            fontSize: 14,
          }}
          className="font-dmsans-bold"
        >
          {question}
        </Text>
        {expanded ? (
          <ChevronUp size={18} color={colors.text} strokeWidth={1.5} />
        ) : (
          <ChevronDown size={18} color={colors.text} strokeWidth={1.5} />
        )}
      </Pressable>

      {/* Answer — conditionally rendered, LayoutAnimation handles the transition */}
      {expanded ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            borderTopWidth: 1,
            borderTopColor: colors.cardBorder,
          }}
        >
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 13,
              lineHeight: 20,
              marginTop: 12,
            }}
            className="font-dmsans"
          >
            {answer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function HelpCenterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const toggleExpanded = useCallback((id: string) => {
    // Trigger smooth layout animation before state update
    LayoutAnimation.configureNext(
      LayoutAnimation.create(200, "easeInEaseOut", "opacity"),
    );
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
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
          style={{ color: colors.text, fontSize: 22 }}
          className="font-dmsans-bold"
        >
          Help Center
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <Text
          style={{ color: colors.textMuted, marginBottom: 20 }}
          className="font-dmsans text-sm"
        >
          Frequently asked questions about Apex Fitness Coach.
        </Text>

        {FAQ_ITEMS.map((item) => (
          <FaqItem
            key={item.id}
            question={item.question}
            answer={item.answer}
            expanded={expandedIds.includes(item.id)}
            onToggle={() => toggleExpanded(item.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
