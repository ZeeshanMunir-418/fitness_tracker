import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearError, signIn, signInWithGoogle } from "@/store/slices/authSlice";
import { Zocial } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
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
  TextInput,
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
  const { loading, error: authError } = useAppSelector((s) => s.auth);
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
      router.replace("/(tabs)");
    }
  };

  const handleGoogleSignIn = async () => {
    await dispatch(signInWithGoogle());
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <SafeAreaView className="flex-1 bg-white px-6">
          {/* Header */}
          <View className="mt-10 items-center">
            <Image
              source={require("@/assets/images/ghost-mascot.png")}
              className="h-16 w-16"
              resizeMode="contain"
            />
            <Text className="mt-4 font-dmsans-bold text-4xl tracking-tight text-black">
              WELCOME BACK
            </Text>
            <Text className="mt-2 text-center font-dmsans text-base text-neutral-500">
              Log in to continue your fitness journey
            </Text>
          </View>

          {/* Form */}
          <View className="mt-10 gap-5">
            {/* Email */}
            <View className="gap-2">
              <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
                Email Address
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`rounded-full border-2 px-5 py-4 font-dmsans text-base text-black ${
                      errors.email ? "border-black/50" : "border-black"
                    }`}
                    placeholder="Email address"
                    placeholderTextColor="#a3a3a3"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.email && (
                <Text className="pl-4 font-dmsans text-xs text-black/60">
                  {errors.email.message}
                </Text>
              )}
            </View>

            {/* Password */}
            <View className="gap-2">
              <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
                Password
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    className={`flex-row items-center rounded-full border-2 px-5 ${
                      errors.password ? "border-black/50" : "border-black"
                    }`}
                  >
                    <TextInput
                      className="flex-1 py-4 font-dmsans text-base text-black"
                      placeholder="Password"
                      placeholderTextColor="#a3a3a3"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={8}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#737373" strokeWidth={2} />
                      ) : (
                        <Eye size={20} color="#737373" strokeWidth={2} />
                      )}
                    </Pressable>
                  </View>
                )}
              />
              {errors.password && (
                <Text className="pl-4 font-dmsans text-xs text-black/60">
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Forgot Password */}
            <Pressable className="self-end">
              <Text className="font-dmsans-bold text-sm text-black">
                Forgot password?
              </Text>
            </Pressable>

            {/* Auth Error */}
            {authError && (
              <View className="rounded-2xl border-2 border-black/10 bg-black/5 px-4 py-3">
                <Text className="font-dmsans text-sm text-black">
                  {authError}
                </Text>
              </View>
            )}
          </View>

          {/* CTA */}
          <View className="mt-8 gap-4">
            {/* Login Button */}
            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              className="relative items-center overflow-hidden rounded-full bg-black px-6 py-5"
            >
              <View className="absolute left-3 right-3 top-2 h-1/2 rounded-full bg-white/10" />
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-dmsans-bold text-[16px] tracking-[2px] text-white">
                  LOG IN
                </Text>
              )}
            </Pressable>

            {/* Divider */}
            <View className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-neutral-200" />
              <Text className="font-dmsans text-xs tracking-widest text-neutral-400">
                OR
              </Text>
              <View className="h-px flex-1 bg-neutral-200" />
            </View>

            {/* Google Button */}
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={loading}
              className="flex-row items-center justify-center gap-3 rounded-full border-2 border-black bg-white px-6 py-5"
            >
              <Zocial name="google" size={20} color="#000" />
              <Text className="font-dmsans-bold text-[15px] tracking-[1px] text-black">
                Continue with Google
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View className="mb-6 mt-auto flex-row items-center justify-center gap-1 pt-8">
            <Text className="font-dmsans text-sm text-neutral-500">
              Don&apos;t have an account?
            </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text className="font-dmsans-bold text-sm text-black">
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
