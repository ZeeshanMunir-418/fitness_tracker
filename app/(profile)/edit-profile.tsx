import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useThemeStyles } from "@/lib/theme/useThemeStyles";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchProfile,
  type GenderType,
  updateProfile,
} from "@/store/slices/profileSlice";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ArrowLeft, ImagePlus, Trash2, UserRound } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GENDER_OPTIONS: { label: string; value: GenderType }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Prefer not to say", value: "prefer_not_to_say" },
];

const parseExtensionFromUri = (uri: string) => {
  const parts = uri.split(".");
  const maybeExt = parts[parts.length - 1]?.split("?")[0]?.toLowerCase();
  if (!maybeExt || maybeExt.length > 5) {
    return "jpg";
  }
  return maybeExt;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useThemeStyles();

  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
  } = useAppSelector((s) => s.profile);
  const userId = useAppSelector((s) => s.auth.user?.id);

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<GenderType>("prefer_not_to_say");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile && !profileLoading) {
      void dispatch(fetchProfile());
    }
  }, [dispatch, profile, profileLoading]);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setAge(profile?.age != null ? String(profile.age) : "");
    setGender(profile?.gender ?? "prefer_not_to_say");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [profile]);

  const avatarInitial = useMemo(() => {
    const value = fullName.trim() || profile?.full_name || "U";
    return value.charAt(0).toUpperCase();
  }, [fullName, profile?.full_name]);

  const handlePickAvatar = async () => {
    try {
      console.log("[editProfile] pick avatar start");
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Photo access is required to choose an avatar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setAvatarUrl(result.assets[0].uri);
        setError(null);
      }
    } catch (pickError) {
      console.error("[editProfile] pick avatar failed", pickError);
      setError("Could not select avatar image.");
    }
  };

  const uploadAvatarIfNeeded = async () => {
    if (!avatarUrl.trim() || avatarUrl.startsWith("http")) {
      return avatarUrl.trim() || null;
    }

    if (!userId) {
      throw new Error("User not found.");
    }

    console.log("[editProfile] uploading avatar");

    const extension = parseExtensionFromUri(avatarUrl);
    const filePath = `${userId}/avatar.${extension}`;

    const response = await fetch(avatarUrl);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, bytes, {
        upsert: true,
        contentType: `image/${extension === "jpg" ? "jpeg" : extension}`,
      });

    if (uploadError) {
      throw uploadError;
    }

    const bucketBase = process.env.EXPO_PUBLIC_SUPABASE_BUCKET_URL;
    if (!bucketBase) {
      throw new Error("Missing EXPO_PUBLIC_SUPABASE_BUCKET_URL.");
    }

    return `${bucketBase.replace(/\/$/, "")}/${filePath}`;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const parsedAge = age.trim() ? Number(age) : null;
      const uploadedAvatarUrl = await uploadAvatarIfNeeded();

      await dispatch(
        updateProfile({
          full_name: fullName.trim() || null,
          age: Number.isNaN(parsedAge) ? null : parsedAge,
          gender,
          avatar_url: uploadedAvatarUrl,
        }),
      ).unwrap();

      console.log("[editProfile] save success");
      router.back();
    } catch (saveError) {
      console.error("[editProfile] save failed", saveError);
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Failed to save profile details.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading && !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.text} />
          <Text
            style={[styles.textMuted, { marginTop: 12 }]}
            className="font-dmsans"
          >
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile && profileError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center px-6">
          <Text style={styles.text} className="font-dmsans-bold text-lg">
            Could not load profile
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 8, textAlign: "center" }]}
            className="font-dmsans"
          >
            {profileError}
          </Text>
          <Button
            onPress={() => void dispatch(fetchProfile())}
            variant="outline"
            className="mt-4"
          >
            <Text style={styles.text} className="font-dmsans-bold text-sm">
              Retry
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

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
          Edit Profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-6">
          <Avatar className="w-24 h-24">
            <AvatarImage source={{ uri: avatarUrl || undefined }} />
            <AvatarFallback style={{ backgroundColor: colors.card }}>
              <View className="items-center justify-center">
                <UserRound
                  size={20}
                  color={colors.textMuted}
                  strokeWidth={1.5}
                />
                <Text
                  style={styles.text}
                  className="font-dmsans-bold text-lg mt-1"
                >
                  {avatarInitial}
                </Text>
              </View>
            </AvatarFallback>
          </Avatar>

          <View className="flex-row gap-2 mt-3">
            <Button variant="outline" onPress={handlePickAvatar}>
              <View className="flex-row items-center gap-2">
                <ImagePlus size={16} color={colors.text} strokeWidth={1.5} />
                <Text style={styles.text} className="font-dmsans-bold text-sm">
                  Upload
                </Text>
              </View>
            </Button>
            {avatarUrl ? (
              <Button
                variant="ghost"
                onPress={() => setAvatarUrl("")}
                className="border-2"
                style={{ borderColor: colors.borderMuted }}
              >
                <View className="flex-row items-center gap-2">
                  <Trash2 size={16} color={colors.text} strokeWidth={1.5} />
                  <Text
                    style={styles.text}
                    className="font-dmsans-bold text-sm"
                  >
                    Remove
                  </Text>
                </View>
              </Button>
            ) : null}
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Full Name
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
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Age
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
            value={age}
            onChangeText={setAge}
            placeholder="Enter age"
            keyboardType="number-pad"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
            className="font-dmsans uppercase tracking-widest"
          >
            Gender
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {GENDER_OPTIONS.map((opt) => {
              const active = gender === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setGender(opt.value)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: active ? colors.border : colors.borderMuted,
                    backgroundColor: active ? colors.text : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.background : colors.text,
                      fontSize: 13,
                    }}
                    className="font-dmsans-bold"
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button onPress={handleSave} disabled={saving} className="w-full mt-6">
          <Text
            style={{ color: colors.background }}
            className="font-dmsans-bold text-base"
          >
            {saving ? "Saving..." : "Save Changes"}
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
      </ScrollView>
    </SafeAreaView>
  );
}
