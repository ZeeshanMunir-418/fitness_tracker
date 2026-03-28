import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { MealType } from "@/store/slices/dailyMealSlice";
import { fetchTodayMeals } from "@/store/slices/dailyMealSlice";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    FlipHorizontal2,
    Loader2,
    Utensils,
    X,
    Zap,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: W, height: H } = Dimensions.get("window");

// ── Layout constants ──────────────────────────────────────────────────────────
const FRAME_SIZE = W * 0.82;
const FRAME_TOP = H * 0.2;
const FRAME_LEFT = (W - FRAME_SIZE) / 2;
const TICK = 28; // corner tick length
const TICK_W = 2.5; // corner tick thickness

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_API_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// ── Meal type config ──────────────────────────────────────────────────────────
const MEAL_META: Record<
  MealType,
  { label: string; color: string; time: string }
> = {
  breakfast: { label: "Breakfast", color: "#F59E0B", time: "6–10 AM" },
  lunch: { label: "Lunch", color: "#34D399", time: "12–2 PM" },
  dinner: { label: "Dinner", color: "#818CF8", time: "6–9 PM" },
  snacks: { label: "Snack", color: "#F472B6", time: "Anytime" },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScannedMacros {
  total_calories: number;
  total_protein_grams: number;
  total_carbs_grams: number;
  total_fat_grams: number;
}
interface ScannedFoodItem {
  food_name: string;
  serving_size: string;
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
}
interface ScanResult {
  daily_meal_id: string;
  meal_name: string;
  meal_type: MealType;
  meal_date: string;
  image_url: string;
  macros: ScannedMacros;
  food_items: ScannedFoodItem[];
}

// ── Corner tick component ─────────────────────────────────────────────────────
type Corner = "tl" | "tr" | "bl" | "br";
const CornerTick = ({ pos, color }: { pos: Corner; color: string }) => {
  const top = pos === "tl" || pos === "tr";
  const left = pos === "tl" || pos === "bl";
  return (
    <View
      style={{
        position: "absolute",
        top: top ? -1 : undefined,
        bottom: top ? undefined : -1,
        left: left ? -1 : undefined,
        right: left ? undefined : -1,
        width: TICK,
        height: TICK,
      }}
    >
      {/* long edge */}
      <View
        style={{
          position: "absolute",
          width: left ? TICK : TICK_W,
          height: top ? TICK_W : TICK,
          top: top ? 0 : undefined,
          bottom: top ? undefined : 0,
          left: left ? 0 : undefined,
          right: left ? undefined : 0,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
      {/* short edge */}
      <View
        style={{
          position: "absolute",
          width: left ? TICK_W : TICK,
          height: top ? TICK : TICK_W,
          top: top ? 0 : undefined,
          bottom: top ? undefined : 0,
          left: left ? 0 : undefined,
          right: left ? undefined : 0,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
    </View>
  );
};

// ── Macro stat ────────────────────────────────────────────────────────────────
const MacroStat = ({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) => (
  <View style={{ flex: 1, alignItems: "center" }}>
    <Text
      style={{
        color,
        fontSize: 11,
        fontFamily: "DMSans-Bold",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        marginBottom: 4,
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        color: "#fff",
        fontSize: 22,
        fontFamily: "DMSans-Bold",
        lineHeight: 24,
      }}
    >
      {value % 1 === 0 ? value : value.toFixed(1)}
    </Text>
    <Text
      style={{
        color: "rgba(255,255,255,0.3)",
        fontSize: 11,
        fontFamily: "DMSans",
        marginTop: 2,
      }}
    >
      {unit}
    </Text>
  </View>
);

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ScanScreen() {
  const dispatch = useAppDispatch();
  const { session } = useAppSelector((s) => s.auth);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [showPicker, setShowPicker] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cameraRef = useRef<CameraView>(null);

  // Animations
  const scanY = useRef(new Animated.Value(0)).current;
  const framePulse = useRef(new Animated.Value(0)).current; // 0=idle, 1=active
  const frameScale = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;
  const scanLoop = useRef<Animated.CompositeAnimation | null>(null);

  const meta = MEAL_META[mealType];

  // Scan line loop
  const startScan = useCallback(() => {
    scanY.setValue(0);
    const loop = Animated.loop(
      Animated.timing(scanY, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    );
    loop.start();
    scanLoop.current = loop;
    Animated.timing(framePulse, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, []);

  const stopScan = useCallback(() => {
    scanLoop.current?.stop();
    scanY.setValue(0);
    Animated.timing(framePulse, {
      toValue: 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, []);

  // Detection success flash
  const flashSuccess = useCallback(() => {
    Animated.sequence([
      Animated.timing(frameScale, {
        toValue: 1.015,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(frameScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Error fade in/out
  useEffect(() => {
    if (error) {
      Animated.timing(errorOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(errorOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [error]);

  // Derived animation values
  const scanTranslateY = scanY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME_SIZE - 2],
  });
  const frameColor = framePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [
      detected ? "#34D399" : "rgba(255,255,255,0.55)",
      detected ? "#34D399" : meta.color,
    ],
  });

  // ── Capture ──────────────────────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (scanning || !cameraRef.current) return;

    // Button press feel
    Animated.sequence([
      Animated.timing(btnScale, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(btnScale, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      setScanning(true);
      setError(null);
      setDetected(false);
      startScan();

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });
      if (!photo?.uri) throw new Error("Failed to capture photo.");

      setDetected(true);
      flashSuccess();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const mealDate = new Date().toISOString().split("T")[0];

      if (!SUPABASE_URL) throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL.");
      if (!SUPABASE_API_KEY)
        throw new Error(
          "Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY.",
        );
      if (!session?.access_token)
        throw new Error("Authentication expired. Please sign in again.");

      const sendRequest = async (fd: FormData) => {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-meal`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_API_KEY,
            Accept: "application/json",
          },
          body: fd,
        });
        const raw = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(raw);
        } catch {}
        return { res, raw, data };
      };

      const fd = new FormData();
      fd.append("image", {
        uri: photo.uri,
        type: "image/jpeg",
        name: "meal.jpg",
      } as any);
      fd.append("meal_type", mealType);
      fd.append("meal_date", mealDate);

      let { res, raw, data } = await sendRequest(fd);

      const firstErr =
        data?.error ?? data?.validation_errors?.join(", ") ?? raw?.trim() ?? "";
      const shouldRetry =
        (!res.ok || data?.error) &&
        /image upload failed|upload failed|invalid image|multipart|file/i.test(
          firstErr,
        );

      if (shouldRetry) {
        const localRes = await fetch(photo.uri);
        if (!localRes.ok) throw new Error("Could not read captured image.");
        const blob = await localRes.blob();
        const fd2 = new FormData();
        fd2.append("image", blob as any, "meal.jpg");
        fd2.append("meal_type", mealType);
        fd2.append("meal_date", mealDate);
        ({ res, raw, data } = await sendRequest(fd2));
      }

      if (!res.ok || !data || data.error) {
        throw new Error(
          data?.error ??
            data?.validation_errors?.join(", ") ??
            (raw ? raw.trim() : null) ??
            `Analysis failed (${res.status})`,
        );
      }

      setResult(data as ScanResult);
      stopScan();
      dispatch(fetchTodayMeals());
    } catch (err) {
      stopScan();
      setDetected(false);
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setScanning(false);
    }
  }, [
    scanning,
    mealType,
    startScan,
    stopScan,
    flashSuccess,
    session?.access_token,
    dispatch,
  ]);

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
    setDetected(false);
  }, []);

  // ── Permission states ─────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2 color="rgba(255,255,255,0.4)" className="animate-spin" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#050505",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 40,
        }}
      >
        <StatusBar barStyle="light-content" />
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "rgba(255,255,255,0.06)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <Utensils size={30} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
        </View>
        <Text
          style={{
            color: "#fff",
            fontSize: 22,
            fontFamily: "DMSans-Bold",
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          Camera Access Needed
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.35)",
            fontFamily: "DMSans",
            fontSize: 14,
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 36,
          }}
        >
          Point your camera at any meal to instantly see its nutritional
          breakdown.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: "#fff",
            borderRadius: 100,
            paddingHorizontal: 36,
            paddingVertical: 15,
          }}
        >
          <Text
            style={{ color: "#000", fontFamily: "DMSans-Bold", fontSize: 15 }}
          >
            Allow Camera
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar barStyle="light-content" />

      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        mode="picture"
      />

      {/* ── Overlay system ── */}
      <View style={{ position: "absolute", inset: 0 } as any}>
        {/* Vignette — 4 panels around the frame */}
        {/* top */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: FRAME_TOP,
            backgroundColor: "rgba(0,0,0,0.72)",
          }}
        />
        {/* bottom */}
        <View
          style={{
            position: "absolute",
            top: FRAME_TOP + FRAME_SIZE,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.72)",
          }}
        />
        {/* left */}
        <View
          style={{
            position: "absolute",
            top: FRAME_TOP,
            left: 0,
            width: FRAME_LEFT,
            height: FRAME_SIZE,
            backgroundColor: "rgba(0,0,0,0.72)",
          }}
        />
        {/* right */}
        <View
          style={{
            position: "absolute",
            top: FRAME_TOP,
            right: 0,
            width: FRAME_LEFT,
            height: FRAME_SIZE,
            backgroundColor: "rgba(0,0,0,0.72)",
          }}
        />

        {/* ── Scan frame ── */}
        <Animated.View
          style={{
            position: "absolute",
            top: FRAME_TOP,
            left: FRAME_LEFT,
            width: FRAME_SIZE,
            height: FRAME_SIZE,
            transform: [{ scale: frameScale }],
          }}
        >
          {/* Corner ticks — animated color */}
          {(["tl", "tr", "bl", "br"] as Corner[]).map((pos) => (
            <Animated.View
              key={pos}
              style={{
                position: "absolute",
                top: pos.startsWith("t") ? 0 : undefined,
                bottom: pos.startsWith("b") ? 0 : undefined,
                left: pos.endsWith("l") ? 0 : undefined,
                right: pos.endsWith("r") ? 0 : undefined,
              }}
            >
              <CornerTick pos={pos} color={detected ? "#34D399" : "#fff"} />
            </Animated.View>
          ))}

          {/* Scan line */}
          {scanning && (
            <Animated.View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 1.5,
                transform: [{ translateY: scanTranslateY }],
              }}
            >
              {/* glow layers */}
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: 20,
                  top: -10,
                  backgroundColor: detected
                    ? "rgba(52,211,153,0.08)"
                    : `${meta.color}14`,
                }}
              />
              <View
                style={{
                  flex: 1,
                  backgroundColor: detected ? "#34D399" : meta.color,
                  opacity: 0.9,
                  shadowColor: detected ? "#34D399" : meta.color,
                  shadowOpacity: 1,
                  shadowRadius: 8,
                }}
              />
            </Animated.View>
          )}

          {/* Detected badge */}
          {detected && !scanning && (
            <View
              style={{
                position: "absolute",
                bottom: -40,
                alignSelf: "center",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(52,211,153,0.12)",
                borderWidth: 1,
                borderColor: "rgba(52,211,153,0.35)",
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 100,
              }}
            >
              <CheckCircle2 size={12} color="#34D399" strokeWidth={2.5} />
              <Text
                style={{
                  color: "#34D399",
                  fontSize: 12,
                  fontFamily: "DMSans-Bold",
                  letterSpacing: 0.3,
                }}
              >
                Meal detected
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ── Top bar ── */}
        <SafeAreaView
          style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 8,
            }}
          >
            {/* Back */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowLeft
                size={18}
                color="rgba(255,255,255,0.8)"
                strokeWidth={2}
              />
            </TouchableOpacity>

            {/* Meal type selector — center */}
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(0,0,0,0.5)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: 100,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: meta.color,
                }}
              />
              <Text
                style={{
                  color: "#fff",
                  fontFamily: "DMSans-Bold",
                  fontSize: 13,
                  letterSpacing: 0.2,
                }}
              >
                {meta.label}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "DMSans",
                  fontSize: 11,
                }}
              >
                ↕
              </Text>
            </TouchableOpacity>

            {/* Flip */}
            <TouchableOpacity
              onPress={() =>
                setFacing((f) => (f === "back" ? "front" : "back"))
              }
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FlipHorizontal2
                size={18}
                color="rgba(255,255,255,0.8)"
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* ── Guide text above frame ── */}
        <View
          style={{
            position: "absolute",
            top: FRAME_TOP - 38,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "rgba(255,255,255,0.38)",
              fontFamily: "DMSans",
              fontSize: 13,
              letterSpacing: 0.2,
            }}
          >
            Frame your meal · tap to analyse
          </Text>
        </View>

        {/* ── Error banner ── */}
        {error && (
          <Animated.View
            style={{
              opacity: errorOpacity,
              position: "absolute",
              bottom: 175,
              left: 20,
              right: 20,
              backgroundColor: "rgba(239,68,68,0.1)",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.35)",
              borderRadius: 14,
              padding: 14,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <AlertCircle size={16} color="#EF4444" style={{ marginTop: 1 }} />
            <Text
              style={{
                color: "#EF4444",
                fontFamily: "DMSans",
                fontSize: 13,
                flex: 1,
                lineHeight: 18,
              }}
            >
              {error}
            </Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <X size={14} color="rgba(239,68,68,0.6)" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Capture button ── */}
        <View
          style={{
            position: "absolute",
            bottom: 58,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          {/* Outer ring */}
          <Animated.View
            style={{
              transform: [{ scale: btnScale }],
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              onPress={handleCapture}
              disabled={scanning}
              activeOpacity={1}
            >
              {/* Outer ring */}
              <View
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 39,
                  borderWidth: 2,
                  borderColor: scanning ? meta.color : "rgba(255,255,255,0.25)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Inner circle */}
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: scanning
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(255,255,255,0.92)",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: scanning ? meta.color : "#fff",
                    shadowOpacity: scanning ? 0.8 : 0.3,
                    shadowRadius: scanning ? 16 : 8,
                  }}
                >
                  {scanning ? (
                    <Loader2
                      color={meta.color}
                      size="small"
                      className="animate-spin"
                    />
                  ) : (
                    <Zap size={22} color="#000" fill="#000" strokeWidth={1.5} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Text
            style={{
              color: "rgba(255,255,255,0.28)",
              fontFamily: "DMSans",
              fontSize: 11,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginTop: 12,
            }}
          >
            {scanning ? "Analysing…" : "Capture"}
          </Text>
        </View>
      </View>

      {/* ── Meal type picker ── */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.75)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowPicker(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: "#0D0D0D",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.07)",
                paddingBottom: 40,
                paddingTop: 12,
              }}
            >
              {/* Handle */}
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "rgba(255,255,255,0.12)",
                  }}
                />
              </View>

              <Text
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "DMSans-Bold",
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                Select meal type
              </Text>

              {MEAL_TYPES.map((type) => {
                const m = MEAL_META[type];
                const active = mealType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => {
                      setMealType(type);
                      setShowPicker(false);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 16,
                      paddingHorizontal: 28,
                      gap: 16,
                      backgroundColor: active
                        ? "rgba(255,255,255,0.04)"
                        : "transparent",
                    }}
                  >
                    {/* Color dot */}
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: m.color,
                        opacity: active ? 1 : 0.35,
                      }}
                    />

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: active ? "#fff" : "rgba(255,255,255,0.45)",
                          fontFamily: active ? "DMSans-Bold" : "DMSans",
                          fontSize: 16,
                        }}
                      >
                        {m.label}
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.2)",
                          fontFamily: "DMSans",
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {m.time}
                      </Text>
                    </View>

                    {active && (
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: m.color,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "#000",
                            fontSize: 12,
                            fontFamily: "DMSans-Bold",
                          }}
                        >
                          ✓
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Result sheet ── */}
      {result && <ResultSheet result={result} onClose={handleReset} />}
    </View>
  );
}

// ── Result bottom sheet ───────────────────────────────────────────────────────
function ResultSheet({
  result,
  onClose,
}: {
  result: ScanResult;
  onClose: () => void;
}) {
  const slide = useRef(new Animated.Value(H * 0.78)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide, {
        toValue: 0,
        tension: 70,
        friction: 13,
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 350,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const { macros, food_items, meal_name, meal_type } = result;
  const meta = MEAL_META[meal_type];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Scrim */}
      <Animated.View
        style={{
          position: "absolute",
          inset: 0 as any,
          backgroundColor: "rgba(0,0,0,0.4)",
          opacity: fadeIn,
        }}
      />

      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          transform: [{ translateY: slide }],
          backgroundColor: "#080808",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.07)",
          maxHeight: H * 0.78,
          overflow: "hidden",
        }}
      >
        {/* Accent line */}
        <View
          style={{ height: 2, backgroundColor: meta.color, opacity: 0.7 }}
        />

        {/* Handle */}
        <View
          style={{ alignItems: "center", paddingTop: 14, paddingBottom: 6 }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.12)",
            }}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48 }}
        >
          {/* ── Header ── */}
          <View
            style={{
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 20,
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    backgroundColor: `${meta.color}1A`,
                    borderRadius: 100,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: meta.color,
                    }}
                  />
                  <Text
                    style={{
                      color: meta.color,
                      fontFamily: "DMSans-Bold",
                      fontSize: 11,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                    }}
                  >
                    {meta.label}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  color: "#fff",
                  fontFamily: "DMSans-Bold",
                  fontSize: 22,
                  lineHeight: 28,
                }}
                numberOfLines={2}
              >
                {meal_name}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: "rgba(255,255,255,0.07)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 4,
              }}
            >
              <X size={15} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          {/* ── Calorie hero ── */}
          <View
            style={{
              marginHorizontal: 24,
              marginBottom: 20,
              backgroundColor: "rgba(255,255,255,0.03)",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.06)",
              paddingVertical: 24,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.3)",
                fontFamily: "DMSans",
                fontSize: 12,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Total Calories
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontFamily: "DMSans-Bold",
                  fontSize: 64,
                  lineHeight: 68,
                }}
              >
                {macros.total_calories}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.25)",
                  fontFamily: "DMSans",
                  fontSize: 18,
                  marginBottom: 10,
                }}
              >
                kcal
              </Text>
            </View>

            {/* Macro row */}
            <View
              style={{
                flexDirection: "row",
                width: "100%",
                paddingHorizontal: 16,
                paddingTop: 16,
                marginTop: 8,
                borderTopWidth: 1,
                borderColor: "rgba(255,255,255,0.05)",
              }}
            >
              <MacroStat
                label="Protein"
                value={macros.total_protein_grams}
                unit="g"
                color="#60A5FA"
              />
              <View
                style={{
                  width: 1,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  marginVertical: 4,
                }}
              />
              <MacroStat
                label="Carbs"
                value={macros.total_carbs_grams}
                unit="g"
                color="#FB923C"
              />
              <View
                style={{
                  width: 1,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  marginVertical: 4,
                }}
              />
              <MacroStat
                label="Fat"
                value={macros.total_fat_grams}
                unit="g"
                color="#FBBF24"
              />
            </View>
          </View>

          {/* ── Food items ── */}
          <Text
            style={{
              color: "rgba(255,255,255,0.25)",
              fontFamily: "DMSans-Bold",
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              paddingHorizontal: 24,
              marginBottom: 12,
            }}
          >
            Detected Items · {food_items.length}
          </Text>

          <View style={{ paddingHorizontal: 16, gap: 6 }}>
            {food_items.map((item, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.055)",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {/* Index */}
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontFamily: "DMSans-Bold",
                      fontSize: 11,
                    }}
                  >
                    {i + 1}
                  </Text>
                </View>

                {/* Name + serving */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#fff",
                      fontFamily: "DMSans-Bold",
                      fontSize: 14,
                      marginBottom: 3,
                    }}
                  >
                    {item.food_name}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.22)",
                        fontFamily: "DMSans",
                        fontSize: 11,
                      }}
                    >
                      {item.serving_size}
                    </Text>
                    <Text
                      style={{
                        color: "#60A5FA",
                        opacity: 0.7,
                        fontFamily: "DMSans",
                        fontSize: 11,
                      }}
                    >
                      P {item.protein_grams.toFixed(1)}g
                    </Text>
                    <Text
                      style={{
                        color: "#FB923C",
                        opacity: 0.7,
                        fontFamily: "DMSans",
                        fontSize: 11,
                      }}
                    >
                      C {item.carbs_grams.toFixed(1)}g
                    </Text>
                    <Text
                      style={{
                        color: "#FBBF24",
                        opacity: 0.7,
                        fontFamily: "DMSans",
                        fontSize: 11,
                      }}
                    >
                      F {item.fat_grams.toFixed(1)}g
                    </Text>
                  </View>
                </View>

                {/* Calories */}
                <Text
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: "DMSans-Bold",
                    fontSize: 14,
                  }}
                >
                  {Math.round(item.calories)}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Actions ── */}
          <View style={{ paddingHorizontal: 24, marginTop: 28, gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                onClose();
                router.back();
              }}
              style={{
                backgroundColor: "#fff",
                borderRadius: 100,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#000",
                  fontFamily: "DMSans-Bold",
                  fontSize: 15,
                }}
              >
                Save & Done
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={{
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.25)",
                  fontFamily: "DMSans",
                  fontSize: 14,
                }}
              >
                Scan another meal
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}
