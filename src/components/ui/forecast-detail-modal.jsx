import {
  AlertCircle,
  Droplet,
  Filter,
  Layers,
  Shuffle,
  Sun,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react-native";
import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

export default function ForecastDetailModal({ visible, onClose, param }) {
  const [timeframe, setTimeframe] = React.useState("6h");
  const [isTfDropdownOpen, setIsTfDropdownOpen] = React.useState(false);

  React.useEffect(() => {
    if (!visible) {
      setIsTfDropdownOpen(false);
    }
  }, [visible]);

  function getFactorMeta(text) {
    const t = (text || "").toLowerCase();
    if (t.includes("temperature")) return { Icon: Thermometer, color: "#f59e0b" };
    if (t.includes("photosynthesis") || t.includes("sun")) return { Icon: Sun, color: "#facc15" };
    if (t.includes("oxygen") || t.includes("do ")) return { Icon: Wind, color: "#14b8a6" };
    if (t.includes("alkalinity") || t.includes("ph")) return { Icon: Droplet, color: "#06b6d4" };
    if (t.includes("evaporation")) return { Icon: Droplet, color: "#fb7185" };
    if (t.includes("inflow") || t.includes("dilution")) return { Icon: Waves, color: "#3b82f6" };
    if (t.includes("sediment") || t.includes("turbidity")) return { Icon: Layers, color: "#92400e" };
    if (t.includes("filter")) return { Icon: Filter, color: "#6366f1" };
    if (t.includes("mixing") || t.includes("shuffle")) return { Icon: Shuffle, color: "#8b5cf6" };
    return { Icon: AlertCircle, color: "#6b7280" };
  }

  function colorWithAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 18,
                padding: 18,
                width: "90%",
                maxHeight: "85%",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a2d51", justifyContent: "center" }}>
                  {param?.key} Forecast Details
                </Text>
              </View>

              {param?.breachPredicted ? (
                <View
                  style={{
                    backgroundColor: "#fee2e2",
                    borderColor: "#ef4444",
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{ color: "#b91c1c", fontSize: 16, fontWeight: "700", marginBottom: 4 }}
                  >
                    Threshold Breach Warning
                  </Text>
                  <Text style={{ color: "#7f1d1d" }}>{param?.alertText}</Text>
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: "#f3f4f6",
                    borderColor: "#e5e7eb",
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: "#374151" }}>{param?.alertText}</Text>
                </View>
              )}

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Timeframe Dropdown */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                    Timeframe of Prediction
                  </Text>
                  <View>
                    <TouchableOpacity
                      onPress={() => setIsTfDropdownOpen((v) => !v)}
                      style={{
                        borderWidth: 1,
                        borderColor: "#2455a9",
                        borderRadius: 10,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        backgroundColor: "#f6fafd",
                      }}
                    >
                      <Text style={{ color: "#1a2d51", fontWeight: "600" }}>
                        {timeframe}
                      </Text>
                    </TouchableOpacity>
                    {isTfDropdownOpen ? (
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: "#e5e7eb",
                          borderRadius: 10,
                          marginTop: 6,
                          overflow: "hidden",
                        }}
                      >
                        {["6h", "12h", "24h"].map((tf) => (
                          <TouchableOpacity
                            key={tf}
                            onPress={() => {
                              setTimeframe(tf);
                              setIsTfDropdownOpen(false);
                            }}
                            style={{
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              backgroundColor:
                                timeframe === tf ? "#eef2ff" : "#ffffff",
                            }}
                          >
                            <Text style={{ color: "#1a2d51" }}>{tf}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Key Influencing Factors */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                    Key Influencing Factors
                  </Text>
                  {param?.factors?.map((factor, idx) => {
                    const { Icon, color } = getFactorMeta(factor);
                    const bg = colorWithAlpha(color, 0.08);
                    return (
                      <View
                        key={idx}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                          paddingVertical: 8,
                          paddingHorizontal: 10,
                          borderRadius: 10,
                          backgroundColor: bg,
                          borderLeftWidth: 3,
                          borderLeftColor: color,
                        }}
                      >
                        <Icon size={18} color={color} />
                        <Text style={{ color: "#1f2937", flex: 1, marginLeft: 8 }}>{factor}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Recommended Actions */}
                <View style={{ marginBottom: 4 }}>
                  <Text
                    style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}
                  >
                    Recommended Actions
                  </Text>
                  <View
                    style={{
                      backgroundColor: "#2455a9",
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#f6fafd", fontWeight: "700" }}>
                      {param?.actionLabel}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
