import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useThemeStyles } from "@/lib/theme/useThemeStyles";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { signOut } from "@/store/slices/authSlice";
import { useRouter } from "expo-router";
import { ArrowLeft, Lock } from "lucide-react-native";
import React, { useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountSecurityScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useThemeStyles();

  const email = useAppSelector((s) => s.auth.session?.user.email);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpdatePassword = async () => {
    setError(null);
    setSuccess(null);

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError("Please fill both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      console.log("[accountSecurity] password updated");
      setSuccess("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (updatePasswordError) {
      console.error(
        "[accountSecurity] password update failed",
        updatePasswordError,
      );
      setError(
        updatePasswordError instanceof Error
          ? updatePasswordError.message
          : "Failed to update password.",
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }

      dispatch(signOut());
      console.log("[accountSecurity] account delete fallback sign out");
      setSuccess("Signed out. Account deletion requires an edge function.");
      setShowDeleteModal(false);
      router.replace("/(auth)/login");
    } catch (deleteError) {
      console.error("[accountSecurity] delete flow failed", deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to continue account delete flow.",
      );
    } finally {
      setDeletingAccount(false);
    }
  };

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
          Account Security
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            { borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 16 },
          ]}
        >
          <Text
            style={styles.textMuted}
            className="font-dmsans-bold text-xs uppercase tracking-widest mb-2"
          >
            Current Email
          </Text>
          <View className="flex-row items-center gap-2">
            <Lock size={16} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={styles.text} className="font-dmsans text-sm">
              {email ?? "No email available"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 16 },
          ]}
        >
          <Text style={styles.text} className="font-dmsans-bold text-sm mb-4">
            Change Password
          </Text>

          <View style={{ marginBottom: 16 }}>
            <Text
              style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
              className="font-dmsans uppercase tracking-widest"
            >
              New Password
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
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              secureTextEntry
            />
          </View>

          <View style={{ marginBottom: 8 }}>
            <Text
              style={[styles.textMuted, { fontSize: 11, marginBottom: 8 }]}
              className="font-dmsans uppercase tracking-widest"
            >
              Confirm Password
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
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              secureTextEntry
            />
          </View>

          <Button
            onPress={handleUpdatePassword}
            disabled={savingPassword}
            className="w-full mt-2"
          >
            <Text
              style={{ color: colors.background }}
              className="font-dmsans-bold text-base"
            >
              {savingPassword ? "Saving..." : "Update Password"}
            </Text>
          </Button>
        </View>

        <View
          style={{
            borderWidth: 2,
            borderRadius: 16,
            padding: 16,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Text style={styles.text} className="font-dmsans-bold text-sm">
            Delete Account
          </Text>
          <Text
            style={[styles.textMuted, { marginTop: 6 }]}
            className="font-dmsans text-xs"
          >
            This signs you out now. Full account deletion requires a Supabase
            edge function.
          </Text>
          <Button
            variant="destructive"
            className="w-full mt-4"
            onPress={() => setShowDeleteModal(true)}
          >
            <Text
              style={{ color: colors.background }}
              className="font-dmsans-bold text-base"
            >
              Delete Account
            </Text>
          </Button>
        </View>

        {error ? (
          <Text
            style={[styles.textMuted, { fontSize: 13, marginTop: 8 }]}
            className="font-dmsans"
          >
            {error}
          </Text>
        ) : null}
        {success ? (
          <Text
            style={[styles.textMuted, { fontSize: 13, marginTop: 8 }]}
            className="font-dmsans"
          >
            {success}
          </Text>
        ) : null}
      </ScrollView>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
        >
          <View
            style={{
              width: "100%",
              borderWidth: 2,
              borderRadius: 20,
              padding: 16,
              borderColor: colors.borderMuted,
              backgroundColor: colors.background,
            }}
          >
            <Text style={styles.text} className="font-dmsans-bold text-base">
              Confirm Delete
            </Text>
            <Text
              style={[styles.textMuted, { marginTop: 8 }]}
              className="font-dmsans text-sm"
            >
              This will sign you out. You can continue deletion from support
              afterward.
            </Text>
            <View className="flex-row gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.text} className="font-dmsans-bold text-sm">
                  Cancel
                </Text>
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onPress={handleDeleteAccount}
                disabled={deletingAccount}
              >
                <Text
                  style={{ color: colors.background }}
                  className="font-dmsans-bold text-sm"
                >
                  {deletingAccount ? "Deleting..." : "Delete"}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
