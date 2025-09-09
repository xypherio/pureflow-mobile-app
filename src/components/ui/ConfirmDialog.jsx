import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

export default function ConfirmDialog({
  visible,
  title = "Confirm",
  message = "Are you sure?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary", // 'primary' | 'destructive'
  onConfirm,
  onCancel,
}) {
  const isDestructive = variant === "destructive";
  const confirmBg = isDestructive ? "#ef4444" : "#2455a9";

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" }}>
        <View style={{ backgroundColor: "#ffffff", borderRadius: 14, width: "86%", padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 6 }}>{title}</Text>
          <Text style={{ fontSize: 14, color: "#374151", marginBottom: 16 }}>{message}</Text>

          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <TouchableOpacity onPress={onCancel} style={{ paddingVertical: 10, paddingHorizontal: 14, marginRight: 8 }}>
              <Text style={{ color: "#6b7280", fontWeight: "600" }}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: confirmBg }}>
              <Text style={{ color: "#ffffff", fontWeight: "700" }}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
} 