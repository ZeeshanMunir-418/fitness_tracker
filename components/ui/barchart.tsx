import { useTheme } from "@/lib/theme/ThemeContext";
import React from "react";
import { Text, View } from "react-native";

interface BarChartProps {
  data: { label: string; value: number }[];
  maxValue: number;
  highlightIndex?: number;
}

export const BarChart = ({ data, maxValue, highlightIndex }: BarChartProps) => {
  const { colors } = useTheme();
  const BAR_HEIGHT = 120;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        height: BAR_HEIGHT + 32,
        paddingHorizontal: 4,
      }}
    >
      {data.map((item, index) => {
        const ratio = maxValue > 0 ? item.value / maxValue : 0;
        const barH = Math.max(4, Math.round(ratio * BAR_HEIGHT));
        const isHighlight = index === highlightIndex;

        return (
          <View
            key={index}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "flex-end",
              marginHorizontal: 2,
            }}
          >
            {/* Value label above bar */}
            {item.value > 0 ? (
              <Text
                style={{
                  color: isHighlight ? colors.text : colors.textFaint,
                  fontSize: 9,
                  marginBottom: 3,
                  fontFamily: "DMSans-Bold",
                }}
              >
                {item.value >= 1000
                  ? `${(item.value / 1000).toFixed(1)}k`
                  : String(item.value)}
              </Text>
            ) : (
              <View style={{ height: 16 }} />
            )}

            {/* Rounded bar */}
            <View
              style={{
                width: "100%",
                height: barH,
                borderRadius: 999,
                backgroundColor: isHighlight ? colors.text : colors.borderMuted,
              }}
            />

            {/* X-axis label */}
            <Text
              style={{
                color: isHighlight ? colors.text : colors.textFaint,
                fontSize: 10,
                marginTop: 6,
                fontFamily: isHighlight ? "DMSans-Bold" : "DMSans-Regular",
              }}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};
