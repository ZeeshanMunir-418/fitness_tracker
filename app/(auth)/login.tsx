import Input from "@/components/ui/input";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearError, signIn, signInWithGoogle } from "@/store/slices/authSlice";
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

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const {
    loading,
    googleLoading,
    error: authError,
  } = useAppSelector((s) => s.auth);
  const {} = useAppSelector((s) => s.onboarding);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const onSubmit = async (data: LoginFormData) => {
    const result = await dispatch(
      signIn({ email: data.email, password: data.password }),
    );
    if (signIn.fulfilled.match(result)) {
    }
  };

  const handleGoogleSignIn = async () => {
    await dispatch(signInWithGoogle());
  };

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
              WELCOME BACK
            </Text>
            <Text
              style={{ color: colors.textMuted, marginTop: 8 }}
              className="font-dmsans text-base text-center"
            >
              Log in to continue your fitness journey
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
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    leftIcon={
                      <Lock
                        size={20}
                        color={colors.textMuted}
                        style={{ marginRight: 12 }}
                      />
                    }
                    rightIcon={
                      <Pressable
                        className="mt-0 h-auto w-auto border-0 p-0"
                        onPress={() => setShowPassword((p) => !p)}
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
                      </Pressable>
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

            {/* Forgot Password */}
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable className="mt-0 self-end border-0 px-0 py-0">
                <Text
                  style={{ color: colors.text }}
                  className="font-dmsans-bold text-sm"
                >
                  Forgot password?
                </Text>
              </Pressable>
            </Link>

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
            {/* Login Button */}
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
                  LOG IN
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
              onPress={handleGoogleSignIn}
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
              Don't have an account?
            </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text
                  style={{ color: colors.text }}
                  className="font-dmsans-bold text-sm"
                >
                  Sign Up
                </Text>
              </Pressable>
            </Link>
          </View>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
