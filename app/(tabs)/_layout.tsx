import { useTheme } from "@/lib/theme/ThemeContext";
import { useAppSelector } from "@/store/hooks";
import { selectUnreadCount } from "@/store/slices/notificationSlice";
import { Tabs, useRouter } from "expo-router";
import {
  Activity,
  Bell,
  Dumbbell,
  Home,
  User,
  Utensils,
} from "lucide-react-native";
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
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
  const { colors, isDark } = useTheme();
  const { session, initialized } = useAppSelector((s) => s.auth);

  const tabBarBottom = Math.max(insets.bottom, 12) + 12;

  useEffect(() => {
    if (!initialized) return;
    if (!session) router.replace("/(auth)/login");
  }, [session, initialized, router]);

  const renderTabIcon = (Icon: IconComponent, props: TabIconProps) => {
    const { color, size, focused } = props;

    return (
      <View
        className="p-2"
        style={{
          borderRadius: 999,
          backgroundColor: focused ? colors.border : "transparent",
        }}
      >
        <Icon size={size} color={focused ? colors.background : color} />
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarLabel: () => null,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: colors.inputBg,
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
            shadowOpacity: isDark ? 0 : 0.08,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: (props) => renderTabIcon(Home, props),
          }}
        />
        <Tabs.Screen
          name="nutrition"
          options={{
            title: "Nutrition",
            tabBarIcon: (props) => renderTabIcon(Utensils, props),
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: "Activity",
            tabBarIcon: (props) => renderTabIcon(Activity, props),
          }}
        />
        <Tabs.Screen
          name="workouts"
          options={{
            title: "Workout",
            tabBarIcon: (props) => renderTabIcon(Dumbbell, props),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: (props) => renderTabIcon(User, props),
          }}
        />
      </Tabs>
    </View>
  );
};

export default TabsLayout;
