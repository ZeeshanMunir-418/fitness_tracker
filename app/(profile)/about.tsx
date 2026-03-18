import { useTheme } from "@/lib/theme/ThemeContext";
import { useThemeStyles } from "@/lib/theme/useThemeStyles";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import {
    ArrowLeft,
    Brain,
    Database,
    ExternalLink,
    Layers,
    Smartphone,
} from "lucide-react-native";
import React from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BUILT_WITH = [
  { label: "Supabase", icon: Database },
  { label: "OpenAI GPT-4o mini", icon: Brain },
  { label: "Expo", icon: Smartphone },
  { label: "Redux Toolkit", icon: Layers },
];

export default function AboutScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemeStyles();

  const version = Constants.expoConfig?.version ?? "1.0.0";
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    "1";

  const openUrl = async (url: string) => {
    try {
      console.log("[about] openUrl", { url });
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (openError) {
      console.error("[about] failed to open url", openError);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
          style={[styles.text, { fontSize: 22 }]}
          className="font-dmsans-bold"
        >
          About
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            { borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 16 },
          ]}
        >
          <Text style={styles.text} className="font-dmsans-bold text-xl">
            Apex Fitness Coach
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 4 }]}
            className="font-dmsans text-sm"
          >
            Version {version}
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 10 }]}
            className="font-dmsans text-sm leading-5"
          >
            Apex Fitness Coach helps you train consistently with adaptive
            workout plans, nutrition tracking, and focused reminders.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 16 },
          ]}
        >
          <Text
            style={styles.textMuted}
            className="font-dmsans-bold text-xs uppercase tracking-widest mb-3"
          >
            Built With
          </Text>
          {BUILT_WITH.map((item) => {
            const Icon = item.icon;
            return (
              <View
                key={item.label}
                style={[
                  styles.input,
                  {
                    borderWidth: 2,
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 8,
                  },
                ]}
                className="flex-row items-center gap-3"
              >
                <Icon size={18} color={colors.text} strokeWidth={1.5} />
                <Text style={styles.text} className="font-dmsans-bold text-sm">
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.card,
            { borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 16 },
          ]}
        >
          <Text
            style={styles.textMuted}
            className="font-dmsans-bold text-xs uppercase tracking-widest mb-3"
          >
            Legal
          </Text>
          <Pressable
            onPress={() => void openUrl("https://yoursite.com/privacy")}
            className="flex-row items-center justify-between py-2"
          >
            <Text style={styles.text} className="font-dmsans-bold text-sm">
              Privacy Policy
            </Text>
            <ExternalLink size={16} color={colors.text} strokeWidth={1.5} />
          </Pressable>
          <View
            style={[styles.divider, { borderTopWidth: 2, marginVertical: 10 }]}
          />
          <Pressable
            onPress={() => void openUrl("https://yoursite.com/terms")}
            className="flex-row items-center justify-between py-2"
          >
            <Text style={styles.text} className="font-dmsans-bold text-sm">
              Terms of Service
            </Text>
            <ExternalLink size={16} color={colors.text} strokeWidth={1.5} />
          </Pressable>
        </View>

        <View
          style={[
            styles.card,
            { borderWidth: 2, borderRadius: 16, padding: 16 },
          ]}
        >
          <Text
            style={styles.textMuted}
            className="font-dmsans text-xs uppercase tracking-widest"
          >
            App Info
          </Text>
          <Text
            style={[styles.text, { marginTop: 8 }]}
            className="font-dmsans text-sm"
          >
            Version: {version}
          </Text>
          <Text style={styles.text} className="font-dmsans text-sm mt-1">
            Build: {buildNumber}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
