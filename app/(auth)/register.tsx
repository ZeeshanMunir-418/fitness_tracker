import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
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
    console.log("Google Sign-Up initiated");
    await dispatch(signInWithGoogle());
  };

  if (emailSent) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
        <Image
          source={require("@/assets/images/ghost-mascot.png")}
          className="h-20 w-20"
          resizeMode="contain"
        />
        <Text className="mt-6 text-center font-dmsans-bold text-3xl tracking-tight text-black">
          CHECK YOUR EMAIL
        </Text>
        <Text className="mt-3 text-center font-dmsans text-base text-neutral-500">
          We sent a confirmation link. Click it to activate your account.
        </Text>
        <Link href="/(auth)/login" asChild>
          <Button className="mt-8 w-full">
            <Text className="font-dmsans-bold text-[16px] tracking-[2px] text-white">
              BACK TO LOG IN
            </Text>
          </Button>
        </Link>
      </SafeAreaView>
    );
  }

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
              GET STARTED
            </Text>
            <Text className="mt-2 text-center font-dmsans text-base text-neutral-500">
              Create your account and start training
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
                        color="#737373"
                        style={{ marginRight: 12 }}
                      />
                    }
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
                        color="#737373"
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
                          <EyeOff size={20} color="#737373" strokeWidth={2} />
                        ) : (
                          <Eye size={20} color="#737373" strokeWidth={2} />
                        )}
                      </Button>
                    }
                  />
                )}
              />
              {errors.password && (
                <Text className="pl-4 font-dmsans text-xs text-black/60">
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Confirm Password */}
            <View className="gap-2">
              <Text className="font-dmsans text-xs uppercase tracking-widest text-neutral-500">
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
                        color="#737373"
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
                          <EyeOff size={20} color="#737373" strokeWidth={2} />
                        ) : (
                          <Eye size={20} color="#737373" strokeWidth={2} />
                        )}
                      </Button>
                    }
                  />
                )}
              />
              {errors.confirmPassword && (
                <Text className="pl-4 font-dmsans text-xs text-black/60">
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>

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
            <Button
              className="w-full"
              onPress={handleSubmit(onSubmit)}
              disabled={loading || googleLoading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-dmsans-bold text-[16px] tracking-[2px] text-white">
                  CREATE ACCOUNT
                </Text>
              )}
            </Button>

            {/* Divider */}
            <View className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-neutral-200" />
              <Text className="font-dmsans text-xs tracking-widest text-neutral-400">
                OR
              </Text>
              <View className="h-px flex-1 bg-neutral-200" />
            </View>

            {/* Google Button */}
            <Button
              className="w-full"
              variant="outline"
              onPress={handleGoogleSignUp}
              disabled={loading || googleLoading}
            >
              <View className="flex-row items-center justify-center gap-2 py-2">
                {googleLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <AntDesign name="google" size={20} color="#000" />
                )}
                <Text className="font-dmsans-bold text-[15px] tracking-[1px] text-black">
                  Continue with Google
                </Text>
              </View>
            </Button>

            <Text className="text-center font-dmsans text-xs text-neutral-400">
              By creating an account you agree to our Terms & Privacy Policy.
            </Text>
          </View>

          {/* Footer */}
          <View className="mb-6 mt-auto flex-row items-center justify-center gap-1 pt-8">
            <Text className="font-dmsans text-sm text-neutral-500">
              Already have an account?
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable className="mt-0 border-0 px-0 py-0">
                <Text className="font-dmsans-bold text-sm text-black">
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
