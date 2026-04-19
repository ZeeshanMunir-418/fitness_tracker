import Input from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme/ThemeContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react-native";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotFormData) => {
    setLoading(true);
    setApiError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: process.env.EXPO_PUBLIC_CALLBACK_URL + "password-reset",
      });

      if (error) {
        setApiError(error.message);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingHorizontal: 24,
          }}
        >
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            className="mt-4 self-start p-1"
          >
            <ArrowLeft size={24} color={colors.text} strokeWidth={1.5} />
          </Pressable>

          {/* Header */}
          <View style={{ marginTop: 32, alignItems: "center" }}>
            <Image
              source={require("@/assets/images/ghost-mascot.png")}
              style={{ height: 64, width: 64 }}
              resizeMode="contain"
            />
            <Text
              style={{ color: colors.text, marginTop: 16 }}
              className="font-dmsans-bold text-4xl tracking-tight"
            >
              {submitted ? "CHECK EMAIL" : "FORGOT PASSWORD"}
            </Text>
            <Text
              style={{ color: colors.textMuted, marginTop: 8 }}
              className="font-dmsans text-base text-center"
            >
              {submitted
                ? `We sent a reset link to\n${getValues("email")}`
                : "Enter your email and we'll send you a reset link"}
            </Text>
          </View>

          {submitted ? (
            // ── Success state ────────────────────────────────────────────────
            <View style={{ marginTop: 48, gap: 16 }}>
              {/* Success card */}
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: colors.cardBorder,
                  backgroundColor: colors.card,
                  paddingHorizontal: 20,
                  paddingVertical: 24,
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <CheckCircle size={40} color={colors.text} strokeWidth={1.5} />
                <Text
                  style={{ color: colors.text }}
                  className="font-dmsans-bold text-base text-center"
                >
                  Reset link sent!
                </Text>
                <Text
                  style={{ color: colors.textMuted }}
                  className="font-dmsans text-sm text-center leading-5"
                >
                  Check your inbox and tap the link to reset your password. The
                  link expires in 1 hour.
                </Text>
              </View>

              {/* Back to login */}
              <Pressable
                onPress={() => router.replace("/(auth)/login")}
                style={{
                  backgroundColor: colors.text,
                  borderRadius: 999,
                  paddingVertical: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 8,
                }}
              >
                <Text
                  style={{ color: colors.background }}
                  className="font-dmsans-bold text-base tracking-widest"
                >
                  BACK TO LOGIN
                </Text>
              </Pressable>

              {/* Resend */}
              <Pressable
                onPress={() => setSubmitted(false)}
                className="self-center py-2"
              >
                <Text
                  style={{ color: colors.textMuted }}
                  className="font-dmsans text-sm text-center"
                >
                  Didn't receive it?{" "}
                  <Text
                    style={{ color: colors.text }}
                    className="font-dmsans-bold"
                  >
                    Try again
                  </Text>
                </Text>
              </Pressable>
            </View>
          ) : (
            // ── Form state ───────────────────────────────────────────────────
            <View style={{ marginTop: 40, gap: 20 }}>
              {/* Email field */}
              <View style={{ gap: 8 }}>
                <Text
                  style={{ color: colors.textMuted }}
                  className="font-dmsans text-xs uppercase tracking-widest"
                >
                  Email Address
                </Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      placeholder="Email address"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      error={!!errors.email}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      leftIcon={
                        <Mail
                          size={20}
                          color={colors.textMuted}
                          style={{ marginRight: 12 }}
                        />
                      }
                    />
                  )}
                />
                {errors.email && (
                  <Text
                    style={{ color: colors.textMuted }}
                    className="font-dmsans text-xs pl-4"
                  >
                    {errors.email.message}
                  </Text>
                )}
              </View>

              {/* API error */}
              {apiError && (
                <View
                  style={{
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: colors.cardBorder,
                    backgroundColor: colors.card,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Text
                    style={{ color: colors.text }}
                    className="font-dmsans text-sm"
                  >
                    {apiError}
                  </Text>
                </View>
              )}

              {/* Submit button */}
              <Pressable
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
                style={{
                  backgroundColor: loading ? colors.textFaint : colors.text,
                  borderRadius: 999,
                  paddingVertical: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 12,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text
                    style={{ color: colors.background }}
                    className="font-dmsans-bold text-base tracking-widest"
                  >
                    SEND RESET LINK
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Footer */}
          <View
            style={{
              marginTop: "auto",
              paddingTop: 32,
              paddingBottom: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Text
              style={{ color: colors.textMuted }}
              className="font-dmsans text-sm"
            >
              Remember your password?
            </Text>
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <Text
                style={{ color: colors.text }}
                className="font-dmsans-bold text-sm"
              >
                Log In
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;
