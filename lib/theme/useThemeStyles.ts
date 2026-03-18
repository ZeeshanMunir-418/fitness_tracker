import { useTheme } from "@/lib/theme/ThemeContext";
import { useMemo } from "react";

export const useThemeStyles = () => {
  const { colors } = useTheme();

  return useMemo(
    () => ({
      container: { backgroundColor: colors.background },
      card: {
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
      },
      text: { color: colors.text },
      textMuted: { color: colors.textMuted },
      textFaint: { color: colors.textFaint },
      input: {
        backgroundColor: colors.inputBg,
        borderColor: colors.borderMuted,
      },
      divider: { borderColor: colors.borderMuted },
      border: { borderColor: colors.border },
      borderMuted: { borderColor: colors.borderMuted },
    }),
    [colors],
  );
};
