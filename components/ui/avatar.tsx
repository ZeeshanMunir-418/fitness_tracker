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

export function Avatar({ children, className, ...props }: AvatarProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <AvatarContext.Provider value={{ imageLoaded, setImageLoaded }}>
      <View
        className={`relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full ${className}`}
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

  // Don't render the Image at all if there is no URI — let the fallback show.
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
  ...props
}: AvatarFallbackProps) {
  const context = useContext(AvatarContext);

  if (!context) return null;

  if (context.imageLoaded) return null;

  return (
    <View
      className={cn("absolute inset-0 items-center justify-center", className)}
      {...props}
    >
      {children}
    </View>
  );
}
