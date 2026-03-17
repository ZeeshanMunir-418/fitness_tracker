import React from "react";
import { Pressable, PressableProps, View } from "react-native";

interface ButtonProps extends PressableProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "icon";
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  size,
  variant,
  ...props
}) => {
  const resolvedVariant = variant || "primary";
  const defaultStyles =
    "rounded-full overflow-hidden items-center justify-center";
  const sizeStyles = {
    sm: "px-3 py-1",
    md: "px-5 py-2",
    lg: "px-7 py-3",
    icon: "p-2",
  };
  const variantStyles = {
    primary: "bg-black",
    secondary: "bg-gray-800",
    ghost: "bg-transparent border border-gray-300",
    destructive: "bg-red-600",
    outline: "bg-transparent border border-black",
  };

  const combinedStyles = `${defaultStyles} ${sizeStyles[size || "md"]} ${
    variantStyles[resolvedVariant]
  } ${className || ""}`;

  const showShine =
    resolvedVariant === "primary" ||
    resolvedVariant === "secondary" ||
    resolvedVariant === "destructive";

  return (
    <Pressable className={combinedStyles} {...props}>
      {showShine ? (
        <View className="absolute top-0 left-[10%] right-[10%] h-1/2 rounded-b-full bg-white/10" />
      ) : null}
      <View className="z-10 items-center justify-center">{children}</View>
    </Pressable>
  );
};
