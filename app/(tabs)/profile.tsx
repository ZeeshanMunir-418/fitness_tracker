import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { signOut } from "@/store/slices/authSlice";
import { fetchProfile } from "@/store/slices/profileSlice";
import { clearThemePreference, toggleTheme } from "@/store/slices/themeSlice";
import { useRouter } from "expo-router";
import { ChevronRight, LogOut, Verified } from "lucide-react-native";
import React, { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface MenuItem {
  id: string;
  title: string;
  description: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
}

interface SettingsGroup {
  section: string;
  menuItems: MenuItem[];
}

const ProfileScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { session } = useAppSelector((s) => s.auth);
  const { data } = useAppSelector((s) => s.profile);
  const { isDark, followSystem, colors } = useTheme();

  useEffect(() => {
    if (!session?.user.id) return;
    if (!data) dispatch(fetchProfile());
  }, [dispatch, session?.user.id, data]);

  const handleLogout = () => {
    dispatch(signOut());
  };

  const handleDarkModeToggle = () => dispatch(toggleTheme());
  const handleUseSystemDefault = () => dispatch(clearThemePreference());

  const profileSettings: SettingsGroup[] = [
    {
      section: "Profile",
      menuItems: [
        {
          id: "edit-profile",
          title: "Edit Profile",
          description:
            "Update your personal details like name, photo, and bio.",
          onPress: () => router.push("/(profile)/edit-profile"),
        },
        {
          id: "fitness-goals",
          title: "Fitness Goals",
          description: "Set or update your fitness and activity goals.",
          onPress: () => router.push("/(profile)/fitness-goals"),
        },
        {
          id: "health-data",
          title: "Health Data",
          description: "Manage weight, height, and other health metrics.",
          onPress: () => router.push("/(profile)/health-data"),
        },
      ],
    },
    {
      section: "Notifications",
      menuItems: [
        {
          id: "notification-settings",
          title: "Notification Settings",
          description: "Manage workout, hydration, and reminder notifications.",
          onPress: () => router.push("/(notifications)/notification-settings"),
        },
      ],
    },
    {
      section: "Privacy & Security",
      menuItems: [
        {
          id: "account-security",
          title: "Account Security",
          description: "Update password and manage login security.",
          onPress: () => router.push("/(profile)/account-security"),
        },
      ],
    },
    {
      section: "App Preferences",
      menuItems: [
        {
          id: "units",
          title: "Units & Measurements",
          description: "Choose between metric or imperial units.",
          onPress: () => router.push("/(profile)/units"),
        },
        {
          id: "theme",
          title: "Dark Mode",
          description: "Manual override for light or dark appearance.",
          rightComponent: (
            <Toggle value={isDark} onValueChange={handleDarkModeToggle} />
          ),
        },
        {
          id: "system-theme",
          title: "Use System Default",
          description: "Follow your device appearance automatically.",
          rightComponent: (
            <Pressable
              onPress={handleUseSystemDefault}
              className="rounded-full px-3 py-1.5"
              style={{
                borderWidth: 2,
                borderColor: followSystem ? colors.border : colors.borderMuted,
                backgroundColor: followSystem ? colors.text : colors.card,
              }}
            >
              <Text
                className="text-xs font-dmsans-bold"
                style={{
                  color: followSystem ? colors.background : colors.text,
                }}
              >
                {followSystem ? "Active" : "Use"}
              </Text>
            </Pressable>
          ),
        },
      ],
    },
    {
      section: "Support",
      menuItems: [
        {
          id: "help-center",
          title: "Help Center",
          description: "Find answers to common questions.",
          onPress: () => router.push("/(profile)/help-center"),
        },
        {
          id: "report-problem",
          title: "Report a Problem",
          description: "Let us know if something isn't working.",
          onPress: () => router.push("/(profile)/report-problem"),
        },
        {
          id: "about",
          title: "About",
          description: "Learn more about the Apex Fitness Coach app.",
          onPress: () => router.push("/(profile)/about"),
        },
      ],
    },
  ];

  const displayName = data?.full_name ?? session?.user?.email ?? "User";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView
      className="flex-1 pt-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* Avatar + name */}
      <View className="px-4 mb-6 items-center justify-center">
        <View className="relative">
          <Avatar className="w-24 h-24">
            <AvatarImage source={{ uri: data?.avatar_url ?? undefined }} />
            <AvatarFallback className="bg-gray-200">
              <Text
                className="text-2xl font-dmsans"
                style={{ color: colors.text }}
              >
                {avatarInitial}
              </Text>
            </AvatarFallback>
          </Avatar>
          {Boolean(session?.user.email_confirmed_at) && (
            <View className="absolute bottom-1 right-1 bg-blue-500 rounded-full p-1">
              <Verified color="#fff" size={12} />
            </View>
          )}
        </View>

        <Text
          className="text-xl font-dmsans-bold mt-4"
          style={{ color: colors.text }}
        >
          {displayName}
        </Text>
        {session?.user.email ? (
          <Text
            className="text-gray-500 text-sm font-dmsans"
            style={{ color: colors.textMuted }}
          >
            {session.user.email}
          </Text>
        ) : null}

        {/* Quick stats */}
        {data && (
          <View
            className="flex-row gap-6 mt-4 border-2 border-gray-100 rounded-2xl px-6 py-3"
            style={{
              borderColor: colors.cardBorder,
              backgroundColor: colors.card,
            }}
          >
            <View className="items-center">
              <Text
                className="font-dmsans-bold text-base"
                style={{ color: colors.text }}
              >
                {data.current_weight ?? "--"}
                {data.weight_unit ?? "kg"}
              </Text>
              <Text
                className="font-dmsans text-xs text-gray-500"
                style={{ color: colors.textMuted }}
              >
                Weight
              </Text>
            </View>
            <View
              className="w-px bg-gray-200"
              style={{ backgroundColor: colors.borderMuted }}
            />
            <View className="items-center">
              <Text
                className="font-dmsans-bold text-base"
                style={{ color: colors.text }}
              >
                {data.bmi ?? "--"}
              </Text>
              <Text
                className="font-dmsans text-xs text-gray-500"
                style={{ color: colors.textMuted }}
              >
                BMI
              </Text>
            </View>
            <View
              className="w-px bg-gray-200"
              style={{ backgroundColor: colors.borderMuted }}
            />
            <View className="items-center">
              <Text
                className="font-dmsans-bold text-base"
                style={{ color: colors.text }}
              >
                {data.daily_calorie_target ?? "--"}
              </Text>
              <Text
                className="font-dmsans text-xs text-gray-500"
                style={{ color: colors.textMuted }}
              >
                kcal/day
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Settings list */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {profileSettings.map((group) => (
          <View key={group.section} className="mb-6">
            <Text
              className="text-xs font-dmsans-bold uppercase text-gray-400 mb-2 px-1"
              style={{ color: colors.textFaint }}
            >
              {group.section}
            </Text>
            <View
              className="border-2 border-gray-100 rounded-2xl overflow-hidden"
              style={{
                borderColor: colors.cardBorder,
                backgroundColor: colors.card,
              }}
            >
              {group.menuItems.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={item.rightComponent ? undefined : item.onPress}
                  disabled={Boolean(item.rightComponent)}
                  className={`px-4 py-4 flex-row items-center justify-between ${
                    index < group.menuItems.length - 1
                      ? "border-b-2 border-gray-100"
                      : ""
                  }`}
                  style={
                    index < group.menuItems.length - 1
                      ? { borderBottomColor: colors.cardBorder }
                      : undefined
                  }
                >
                  <View className="flex-1 mr-3">
                    <Text
                      className="text-sm font-dmsans-bold"
                      style={{ color: colors.text }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      className="text-gray-500 text-xs mt-0.5 font-dmsans"
                      style={{ color: colors.textMuted }}
                    >
                      {item.description}
                    </Text>
                  </View>
                  {item.rightComponent ? (
                    item.rightComponent
                  ) : (
                    <ChevronRight
                      size={18}
                      color={colors.textFaint}
                      strokeWidth={1.5}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Button onPress={handleLogout} className="w-full mt-2">
          <View className="flex-row items-center justify-center gap-2 py-1">
            <LogOut
              color={isDark ? "#000000" : "#ffffff"}
              size={20}
              strokeWidth={1.5}
            />
            <Text
              className="text-white font-dmsans-bold text-base"
              style={{ color: isDark ? "#000000" : "#ffffff" }}
            >
              Logout
            </Text>
          </View>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
