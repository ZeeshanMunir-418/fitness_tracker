import { useTheme } from "@/lib/theme/ThemeContext";
import React from "react";
import { TextInput, TextInputProps, View } from "react-native";

interface InputProps extends TextInputProps {
  className?: string;
  containerClassName?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
}

const Input = ({
  className = "",
  containerClassName = "",
  leftIcon,
  rightIcon,
  error,
  ...props
}: InputProps) => {
  const { colors } = useTheme();

  return (
    <View
      className={`flex-row items-center rounded-full border-2 px-5 ${
        error ? "border-black/50" : "border-black"
      } ${containerClassName}`}
      style={{
        backgroundColor: colors.inputBg,
        borderColor: error ? colors.borderMuted : colors.border,
      }}
    >
      {leftIcon}

      <TextInput
        className={`flex-1 py-4 font-dmsans text-base text-black ${className}`}
        style={{ color: colors.text }}
        placeholderTextColor={colors.textMuted}
        {...props}
      />

      {rightIcon}
    </View>
  );
};

export default Input;
