import { useAppSelector } from "@/store/hooks";
import { Tabs, useRouter } from "expo-router";
import { Activity, Dumbbell, Home, User, Utensils } from "lucide-react-native";
import React, { useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabIconProps = {
  color: string;
  size: number;
  focused: boolean;
};

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

const TabsLayout = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, initialized } = useAppSelector((s) => s.auth);

  const tabBarBottom = Math.max(insets.bottom, 12) + 12;

  useEffect(() => {
    if (!initialized) return;
    if (!session) router.replace("/(auth)/login");
  }, [session, initialized, router]);

  const renderTabIcon =
    (Icon: IconComponent) =>
    ({ color, size, focused }: TabIconProps) => (
      <View
        className="p-2"
        style={{
          borderRadius: 999,
          backgroundColor: focused ? "#111827" : "transparent",
        }}
      >
        <Icon size={size} color={focused ? "#ffffff" : color} />
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabel: () => null,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 0,
          elevation: 5,
          height: 54,
          width: "80%",
          marginHorizontal: "10%",
          paddingBottom: 10,
          paddingTop: 8,
          position: "absolute",
          bottom: tabBarBottom,
          borderRadius: 30,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: renderTabIcon(Home),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: "Nutrition",
          tabBarIcon: renderTabIcon(Utensils),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: renderTabIcon(Activity),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workout",
          tabBarIcon: renderTabIcon(Dumbbell),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: renderTabIcon(User),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
