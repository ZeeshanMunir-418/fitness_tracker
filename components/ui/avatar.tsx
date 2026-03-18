import { useTheme } from "@/lib/theme/ThemeContext";
import { cn } from "@/utils/cn";
import React, { createContext, useContext, useState } from "react";
import { Image, ImageProps, View, ViewProps } from "react-native";

type AvatarContextType = {
  imageLoaded: boolean;
  setImageLoaded: (value: boolean) => void;
};

const AvatarContext = createContext<AvatarContextType | null>(null);

interface AvatarProps extends ViewProps {
  className?: string;
}

export function Avatar({ children, className, style, ...props }: AvatarProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { colors } = useTheme();

  return (
    <AvatarContext.Provider value={{ imageLoaded, setImageLoaded }}>
      <View
        className={cn(
          "relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full",
          className,
        )}
        style={[
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            borderWidth: 2,
          },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    </AvatarContext.Provider>
  );
}

interface AvatarImageProps extends ImageProps {
  className?: string;
}

export function AvatarImage({ className, ...props }: AvatarImageProps) {
  const context = useContext(AvatarContext);

  if (!context) return null;

  const { setImageLoaded } = context;

  const uri = (props.source as { uri?: string })?.uri;
  if (!uri) return null;

  return (
    <Image
      {...props}
      className={cn("h-full w-full", className)}
      onLoad={() => setImageLoaded(true)}
      onError={() => setImageLoaded(false)}
    />
  );
}

interface AvatarFallbackProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
}

export function AvatarFallback({
  className,
  children,
  style,
  ...props
}: AvatarFallbackProps) {
  const context = useContext(AvatarContext);
  const { colors } = useTheme();

  if (!context) return null;
  if (context.imageLoaded) return null;

  return (
    <View
      className={cn("absolute inset-0 items-center justify-center", className)}
      style={[{ backgroundColor: colors.card }, style]}
      {...props}
    >
      {children}
    </View>
  );
}
