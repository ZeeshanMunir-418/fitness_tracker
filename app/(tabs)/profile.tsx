import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { signOut } from "@/store/slices/authSlice";
import { fetchProfile } from "@/store/slices/profileSlice";
import { useRouter } from "expo-router";
import { LogOut, Verified } from "lucide-react-native";
import React, { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ProfileScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { session } = useAppSelector((s) => s.auth);
  const { data } = useAppSelector((s) => s.profile);

  const profileSettings = [
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
          id: "privacy-settings",
          title: "Privacy Settings",
          description: "Control who can see your profile and activity.",
          onPress: () => router.push("/(profile)/privacy-settings"),
        },
        {
          id: "account-security",
          title: "Account Security",
          description: "Update password and manage login security.",
          onPress: () => router.push("/(profile)/account-security"),
        },
        {
          id: "data-permissions",
          title: "Data Permissions",
          description: "Manage access to health and fitness data.",
          onPress: () => router.push("/(profile)/data-permissions"),
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
          title: "App Theme",
          description: "Switch between light and dark mode.",
          onPress: () => router.push("/(profile)/theme"),
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
          description: "Let us know if something isn’t working.",
          onPress: () => router.push("/(profile)/report-problem"),
        },
        {
          id: "about",
          title: "About",
          description: "Learn more about the Fitness69 app.",
          onPress: () => router.push("/(profile)/about"),
        },
      ],
    },
  ];

  useEffect(() => {
    if (!session?.user.id) return;
    dispatch(fetchProfile(session.user.id));
  }, [dispatch, session?.user.id]);

  const handleLogout = () => {
    dispatch(signOut());
  };

  return (
    <SafeAreaView className="flex-1 pt-8">
      <View className="px-4 mb-6 items-center justify-center">
        <View className="relative">
          <Avatar className="w-24 h-24">
            <AvatarImage
              source={{
                uri: (data?.avatar_url as string | undefined) || undefined,
              }}
            />
            <AvatarFallback className="bg-gray-200">
              <Text className="text-2xl font-dmsans">
                {String(data?.full_name ?? session?.user?.email ?? "?")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </AvatarFallback>
          </Avatar>
          {Boolean(session?.user.email_confirmed_at) && (
            <View className="absolute bottom-1 right-1 bg-blue-500 rounded-full p-1">
              <Verified color="#fff" size={12} />
            </View>
          )}
        </View>
        <Text className="text-xl font-dmsans-bold mt-4">
          {data?.full_name ?? session?.user?.email}
        </Text>
        <Text>
          {session?.user.email && (
            <Text className="text-gray-500 text-sm">{session.user.email}</Text>
          )}
        </Text>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      >
        {profileSettings.map((group) => (
          <View key={group.section} className="mb-6">
            <Text className="text-xs font-dmsans-bold uppercase text-gray-400 mb-2 px-1">
              {group.section}
            </Text>
            {group.menuItems.map((setting) => (
              <Pressable
                key={setting.id}
                onPress={setting.onPress}
                className="mt-0 mb-2 rounded-lg border-b border-gray-200 px-4 pb-3"
              >
                <Text className="text-sm font-dmsans-bold">
                  {setting.title}
                </Text>
                <Text className="text-gray-500 text-sm mt-1 font-dmsans">
                  {setting.description}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}

        <Button onPress={handleLogout} className="w-full">
          <View className="flex-row items-center space-x-2 justify-center gap-2 py-1">
            <LogOut color="#fff" size={24} />
            <Text className="text-white font-dmsans text-lg">Logout</Text>
          </View>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
