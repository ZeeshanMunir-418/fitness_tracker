import { useTheme } from "@/lib/theme/ThemeContext";
import React from "react";
import {
  Pressable,
  PressableProps,
  Text as RNText,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

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
  style,
  ...props
}) => {
  const { colors, isDark } = useTheme();
  const resolvedVariant = variant ?? "primary";

  // ── Size ──────────────────────────────────────────────────────────────────
  const sizeClass = {
    sm: "px-3 py-1",
    md: "px-5 py-2",
    lg: "px-7 py-3",
    icon: "p-2",
  }[size ?? "md"];

  // ── Variant inline style ───────────────────────────────────────────────────
  const variantStyle: ViewStyle = (() => {
    switch (resolvedVariant) {
      case "primary":
        return { backgroundColor: colors.text, borderWidth: 0 };
      case "secondary":
        return {
          backgroundColor: isDark ? "#262626" : "#1f2937",
          borderWidth: 0,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: colors.borderMuted,
        };
      case "destructive":
        return { backgroundColor: "#dc2626", borderWidth: 0 };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: colors.border,
        };
    }
  })();

  // ── Text color ─────────────────────────────────────────────────────────────
  const textColor = (() => {
    switch (resolvedVariant) {
      case "primary":
        return colors.background;
      case "secondary":
        return "#ffffff";
      case "ghost":
        return colors.text;
      case "destructive":
        return "#ffffff";
      case "outline":
        return colors.text;
    }
  })();

  const showShine =
    resolvedVariant === "primary" ||
    resolvedVariant === "secondary" ||
    resolvedVariant === "destructive";

  // ── Inject text color into child RNText nodes ──────────────────────────────
  const styledChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === RNText) {
      const childProps = child.props as { style?: object };
      return React.cloneElement(
        child as React.ReactElement<{ style?: object }>,
        {
          style: StyleSheet.flatten([
            { color: textColor },
            childProps.style ?? {},
          ]),
        },
      );
    }
    return child;
  });

  // ── Resolve style prop safely (handles function form from Pressable) ────────
  const resolvedExternalStyle = (
    typeof style === "function" ? undefined : style
  ) as StyleProp<ViewStyle>;

  return (
    <Pressable
      className={`rounded-full overflow-hidden items-center justify-center ${sizeClass} ${className ?? ""}`}
      style={[variantStyle, resolvedExternalStyle]}
      {...props}
    >
      {showShine ? (
        <View className="absolute top-0 left-[10%] right-[10%] h-1/2 rounded-b-full bg-white/10" />
      ) : null}
      <View className="z-10 items-center justify-center">{styledChildren}</View>
    </Pressable>
  );
};
