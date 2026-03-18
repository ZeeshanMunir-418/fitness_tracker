import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useThemeStyles } from "@/lib/theme/useThemeStyles";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// create table feedback (
//   id uuid primary key default gen_random_uuid(),
//   user_id uuid references auth.users(id) on delete cascade,
//   subject text not null,
//   description text not null,
//   created_at timestamptz default now()
// );
// alter table feedback enable row level security;
// create policy "users_own_feedback" on feedback for insert with check (auth.uid() = user_id);

export default function ReportProblemScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemeStyles();
  const userId = useAppSelector((s) => s.auth.session?.user.id);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      if (!userId) {
        throw new Error("You must be logged in to submit feedback.");
      }

      if (!subject.trim() || !description.trim()) {
        throw new Error("Subject and description are required.");
      }

      const { error: insertError } = await supabase.from("feedback").insert({
        user_id: userId,
        subject: subject.trim(),
        description: description.trim(),
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        throw insertError;
      }

      console.log("[reportProblem] feedback submitted");
      setSubmitted(true);
      setSubject("");
      setDescription("");
    } catch (submitError) {
      console.error("[reportProblem] submit failed", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit report.",
      );
    } finally {
      setSaving(false);
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
          Report a Problem
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {submitted ? (
          <View
            style={[
              styles.card,
              {
                borderWidth: 2,
                borderRadius: 16,
                padding: 20,
                alignItems: "center",
              },
            ]}
          >
            <CheckCircle2 size={38} color={colors.text} strokeWidth={1.5} />
            <Text
              style={[styles.text, { marginTop: 12 }]}
              className="font-dmsans-bold text-base"
            >
              Report submitted
            </Text>
            <Text
              style={[styles.textMuted, { marginTop: 6, textAlign: "center" }]}
              className="font-dmsans text-sm"
            >
              Thank you. Our team will review your feedback shortly.
            </Text>
          </View>
        ) : (
          <>
            <View style={{ marginBottom: 16 }}>
              <Text
                style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
                className="font-dmsans uppercase tracking-widest"
              >
                Subject
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderWidth: 2,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: colors.text,
                  },
                ]}
                placeholderTextColor={colors.textFaint}
                className="font-dmsans"
                value={subject}
                onChangeText={setSubject}
                placeholder="What issue are you facing?"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text
                style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
                className="font-dmsans uppercase tracking-widest"
              >
                Description
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderWidth: 2,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: colors.text,
                    minHeight: 140,
                    textAlignVertical: "top",
                  },
                ]}
                placeholderTextColor={colors.textFaint}
                className="font-dmsans"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                placeholder="Describe what happened and how to reproduce it."
              />
            </View>

            <Button
              onPress={handleSubmit}
              disabled={saving}
              className="w-full mt-2"
            >
              <Text
                style={{ color: colors.background }}
                className="font-dmsans-bold text-base"
              >
                {saving ? "Submitting..." : "Submit Report"}
              </Text>
            </Button>

            {error ? (
              <Text
                style={[styles.textMuted, { fontSize: 13, marginTop: 8 }]}
                className="font-dmsans"
              >
                {error}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
