import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearError, signInWithGoogle, signUp } from "@/store/slices/authSlice";
import { AntDesign } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useEffect, useState } from "react";
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

const registerSchema = z
  .object({
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const {
    loading,
    googleLoading,
    error: authError,
  } = useAppSelector((s) => s.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const onSubmit = async (data: RegisterFormData) => {
    const result = await dispatch(
      signUp({ email: data.email, password: data.password }),
    );
    if (signUp.fulfilled.match(result)) {
      if (result.payload.session) {
        router.replace("/(onboarding)/step-1");
      } else {
        setEmailSent(true);
      }
    }
  };

  const handleGoogleSignUp = async () => {
    await dispatch(signInWithGoogle());
  };

  if (emailSent) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Image
          source={require("@/assets/images/ghost-mascot.png")}
          style={{ height: 80, width: 80 }}
          resizeMode="contain"
        />
        <Text
          style={{ color: colors.text, marginTop: 24 }}
          className="font-dmsans-bold text-3xl tracking-tight text-center"
        >
          CHECK YOUR EMAIL
        </Text>
        <Text
          style={{ color: colors.textMuted, marginTop: 12 }}
          className="font-dmsans text-base text-center"
        >
          We sent a confirmation link. Click it to activate your account.
        </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable
            style={{
              marginTop: 32,
              width: "100%",
              backgroundColor: colors.text,
              borderRadius: 999,
              paddingVertical: 18,
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: colors.background }}
              className="font-dmsans-bold text-base tracking-widest"
            >
              BACK TO LOG IN
            </Text>
          </Pressable>
        </Link>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingHorizontal: 24,
          }}
        >
          {/* Header */}
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <Image
              source={require("@/assets/images/ghost-mascot.png")}
              style={{ height: 64, width: 64 }}
              resizeMode="contain"
            />
            <Text
              style={{ color: colors.text, marginTop: 16 }}
              className="font-dmsans-bold text-4xl tracking-tight"
            >
              GET STARTED
            </Text>
            <Text
              style={{ color: colors.textMuted, marginTop: 8 }}
              className="font-dmsans text-base text-center"
            >
              Create your account and start training
            </Text>
          </View>

          {/* Form */}
          <View style={{ marginTop: 40, gap: 20 }}>
            {/* Email */}
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

            {/* Password */}
            <View style={{ gap: 8 }}>
              <Text
                style={{ color: colors.textMuted }}
                className="font-dmsans text-xs uppercase tracking-widest"
              >
                Password
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={!!errors.password}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    leftIcon={
                      <Lock
                        size={20}
                        color={colors.textMuted}
                        style={{ marginRight: 12 }}
                      />
                    }
                    rightIcon={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-0 h-auto w-auto border-0 p-0"
                        onPress={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? (
                          <EyeOff
                            size={20}
                            color={colors.textMuted}
                            strokeWidth={2}
                          />
                        ) : (
                          <Eye
                            size={20}
                            color={colors.textMuted}
                            strokeWidth={2}
                          />
                        )}
                      </Button>
                    }
                  />
                )}
              />
              {errors.password && (
                <Text
                  style={{ color: colors.textMuted }}
                  className="font-dmsans text-xs pl-4"
                >
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={{ gap: 8 }}>
              <Text
                style={{ color: colors.textMuted }}
                className="font-dmsans text-xs uppercase tracking-widest"
              >
                Confirm Password
              </Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    placeholder="Confirm password"
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={!!errors.confirmPassword}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    leftIcon={
                      <Lock
                        size={20}
                        color={colors.textMuted}
                        style={{ marginRight: 12 }}
                      />
                    }
                    rightIcon={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-0 h-auto w-auto border-0 p-0"
                        onPress={() => setShowConfirm((prev) => !prev)}
                      >
                        {showConfirm ? (
                          <EyeOff
                            size={20}
                            color={colors.textMuted}
                            strokeWidth={2}
                          />
                        ) : (
                          <Eye
                            size={20}
                            color={colors.textMuted}
                            strokeWidth={2}
                          />
                        )}
                      </Button>
                    }
                  />
                )}
              />
              {errors.confirmPassword && (
                <Text
                  style={{ color: colors.textMuted }}
                  className="font-dmsans text-xs pl-4"
                >
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>

            {/* Auth Error */}
            {authError && (
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
                  {authError}
                </Text>
              </View>
            )}
          </View>

          {/* CTA */}
          <View style={{ marginTop: 32, gap: 16 }}>
            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={loading || googleLoading}
              style={{
                backgroundColor:
                  loading || googleLoading ? colors.textFaint : colors.text,
                borderRadius: 999,
                paddingVertical: 18,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text
                  style={{ color: colors.background }}
                  className="font-dmsans-bold text-base tracking-widest"
                >
                  CREATE ACCOUNT
                </Text>
              )}
            </Pressable>

            {/* Divider */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: colors.borderMuted,
                }}
              />
              <Text
                style={{ color: colors.textFaint }}
                className="font-dmsans text-xs tracking-widest"
              >
                OR
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: colors.borderMuted,
                }}
              />
            </View>

            {/* Google Button */}
            <Pressable
              onPress={handleGoogleSignUp}
              disabled={loading || googleLoading}
              style={{
                borderRadius: 999,
                borderWidth: 2,
                borderColor: colors.border,
                backgroundColor: "transparent",
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <AntDesign name="google" size={20} color={colors.text} />
              )}
              <Text
                style={{ color: colors.text }}
                className="font-dmsans-bold text-base"
              >
                Continue with Google
              </Text>
            </Pressable>

            <Text
              style={{ color: colors.textFaint }}
              className="font-dmsans text-xs text-center"
            >
              By creating an account you agree to our Terms & Privacy Policy.
            </Text>
          </View>

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
              Already have an account?
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text
                  style={{ color: colors.text }}
                  className="font-dmsans-bold text-sm"
                >
                  Log In
                </Text>
              </Pressable>
            </Link>
          </View>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;
