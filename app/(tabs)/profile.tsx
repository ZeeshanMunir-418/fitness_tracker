import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { signOut } from "@/store/slices/authSlice";
import React from "react";
import { Pressable, Text, View } from "react-native";

const ProfileScreen = () => {
  const dispatch = useAppDispatch();
  const { session } = useAppSelector((s) => s.auth);

  const handleLogout = () => {
    dispatch(signOut());
  };

  return (
    <View className="flex-1 items-center justify-center">
      <Text className="font-dmsans text-lg text-black">
        Welcome, {session?.user.email}
      </Text>
      <Pressable
        onPress={handleLogout}
        className="mt-4 rounded-full bg-red-500 px-5 py-3"
      >
        <Text className="font-dmsans text-white">Logout</Text>
      </Pressable>
    </View>
  );
};

export default ProfileScreen;
