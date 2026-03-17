import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";

interface CustomDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  visible: boolean;
  onClose: () => void;
}

export function CustomDatePicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
  visible,
  onClose,
}: CustomDatePickerProps) {
  const [tempDate, setTempDate] = useState(value);

  const handleChange = (_: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate) return;

    setTempDate(selectedDate);

    if (Platform.OS === "android") {
      onChange(selectedDate);
      onClose();
    }
  };

  // ANDROID → native dialog only
  if (Platform.OS === "android") {
    return visible ? (
      <DateTimePicker
        value={value}
        mode="date"
        display="default"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={handleChange}
      />
    ) : null;
  }

  // IOS → custom modal
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-white p-6">
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handleChange}
          />

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={onClose}
              className="flex-1 rounded-full border border-black py-3"
            >
              <Text className="text-center font-dmsans-bold">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                onChange(tempDate);
                onClose();
              }}
              className="flex-1 rounded-full bg-black py-3"
            >
              <Text className="text-center font-dmsans-bold text-white">
                Confirm
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
