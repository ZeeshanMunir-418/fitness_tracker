import { useAppSelector } from "@/store/hooks";
import { Tabs, useRouter } from "expo-router";
import { Activity, Dumbbell, Home, User, Utensils } from "lucide-react-native";
import React, { useEffect } from "react";

const TabsLayout = () => {
  const router = useRouter();
  const { session, initialized } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!initialized) return;
    if (!session) router.replace("/(auth)/login");
  }, [session, initialized, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#9ca3af",
        // tabBarLabel: () => null,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 0,
          elevation: 5,
          height: 60,
          width: "90%",
          marginHorizontal: "5%",
          paddingBottom: 8,
          paddingTop: 8,
          position: "absolute",
          bottom: 16,
          borderRadius: 30,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: "Nutrition",
          tabBarIcon: ({ color, size }) => (
            <Utensils size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => (
            <Activity size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workout",
          tabBarIcon: ({ color, size }) => (
            <Dumbbell size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
