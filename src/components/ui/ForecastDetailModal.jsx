import { generateInsight } from "@services/ai/geminiAPI"; // Import generateInsight
import {
  AlertCircle,
  Droplet,
  Filter,
  Layers, // Added Lightbulb icon
  Shuffle,
  Sun,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native"; // Added ActivityIndicator
import { formatInsightText } from "../../utils/textFormatter";

// Helper function to limit words
function limitWords(text, limit) {
  if (!text) return "";
  const words = text.split(" ");
  if (words.length > limit) {
    return words.slice(0, limit).join(" ") + "...";
  }
  return text;
}

export default function ForecastDetailModal({ visible, onClose, param }) {
  const [timeframe, setTimeframe] = React.useState("6h");
  const [isTfDropdownOpen, setIsTfDropdownOpen] = React.useState(false);
  const [geminiResponse, setGeminiResponse] = useState(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState(null);

  React.useEffect(() => {
    if (!visible) {
      setIsTfDropdownOpen(false);
      setGeminiResponse(null);
      setGeminiError(null);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && param?.key) {
      const fetchGeminiInsights = async () => {
        setIsGeminiLoading(true);
        setGeminiError(null);
        setGeminiResponse(null);
        try {
          const paramSensorData = {
            [param.key.toLowerCase()]: parseFloat(param.value || 0),
            timestamp: new Date().toISOString(),
          };
          const response = await generateInsight(
            paramSensorData,
            `forecast-modal-${param.key}`
          );
          setGeminiResponse(response);
        } catch (err) {
          console.error(
            `Error fetching Gemini insights for ${param.key}:`,
            err
          );
          setGeminiError("Failed to load AI insights. Please try again later.");
        } finally {
          setIsGeminiLoading(false);
        }
      };
      fetchGeminiInsights();
    }
  }, [visible, param]);

  function getFactorMeta(text) {
    const t = (text || "").toLowerCase();
    if (t.includes("temperature"))
      return { Icon: Thermometer, color: "#f59e0b", category: "Temperature" };
    if (t.includes("photosynthesis") || t.includes("sun"))
      return { Icon: Sun, color: "#facc15", category: "Sunlight" };
    if (t.includes("oxygen") || t.includes("do "))
      return { Icon: Wind, color: "#14b8a6", category: "Dissolved Oxygen" };
    if (t.includes("alkalinity") || t.includes("ph"))
      return { Icon: Droplet, color: "#06b6d4", category: "pH/Alkalinity" };
    if (t.includes("evaporation"))
      return { Icon: Droplet, color: "#fb7185", category: "Evaporation" };
    if (t.includes("inflow") || t.includes("dilution"))
      return { Icon: Waves, color: "#3b82f6", category: "Inflow/Dilution" };
    if (t.includes("sediment") || t.includes("turbidity"))
      return { Icon: Layers, color: "#92400e", category: "Turbidity" };
    if (t.includes("filter"))
      return { Icon: Filter, color: "#6366f1", category: "Filtration" };
    if (t.includes("mixing") || t.includes("shuffle"))
      return { Icon: Shuffle, color: "#8b5cf6", category: "Mixing" };
    return { Icon: AlertCircle, color: "#6b7280", category: "General" }; // Default icon
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
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#1a2d51",
                    justifyContent: "center",
                  }}
                >
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
                    style={{
                      color: "#b91c1c",
                      fontSize: 16,
                      fontWeight: "700",
                      marginBottom: 4,
                    }}
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
                {/* Key Influencing Factors from Gemini API */}
                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}
                  >
                    Key Influencing Factors
                  </Text>
                  {isGeminiLoading ? (
                    <ActivityIndicator
                      size="small"
                      color="#3b82f6"
                      style={{ marginVertical: 10 }}
                    />
                  ) : geminiError ? (
                    <Text style={{ color: "#ef4444", fontSize: 13 }}>
                      {geminiError}
                    </Text>
                  ) : geminiResponse?.insights?.overallInsight ? (
                    geminiResponse.insights.overallInsight
                      .split(/[.!?]\s*/)
                      .filter((s) => s.trim().length > 0)
                      .filter((factor) => {
                        const { category } = getFactorMeta(factor);
                        if (!param.key || category === "General") {
                          return true;
                        }
                        return param.key
                          .toLowerCase()
                          .includes(category.toLowerCase());
                      })
                      .slice(0, 3)
                      .map((factor, idx) => {
                        const { Icon, color, category } = getFactorMeta(factor);

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
                            <View style={{ flex: 1, marginLeft: 8 }}>
                              {formatInsightText(
                                limitWords(factor, 20),
                                "info"
                              )}{" "}
                              {/* Limit words to 8 and format */}
                            </View>
                          </View>
                        );
                      })
                  ) : (
                    <Text style={{ color: "#6b7280", fontSize: 13 }}>
                      No key influencing factors available.
                    </Text>
                  )}
                </View>

                {/* Recommended Actions from Gemini API */}
                <View style={{ marginBottom: 4 }}>
                  <Text
                    style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}
                  >
                    Recommended Actions
                  </Text>
                  {isGeminiLoading ? (
                    <ActivityIndicator
                      size="small"
                      color="#3b82f6"
                      style={{ marginVertical: 10 }}
                    />
                  ) : geminiError ? (
                    <Text style={{ color: "#ef4444", fontSize: 13 }}>
                      {geminiError}
                    </Text>
                  ) : geminiResponse?.suggestions &&
                    geminiResponse.suggestions.length > 0 ? (
                    geminiResponse.suggestions.map((suggestion, idx) => {
                      const { Icon, color } = getFactorMeta(
                        suggestion.parameter
                      );
                      const bg = colorWithAlpha(color, 0.08);
                      return (
                        <View
                          key={idx}
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-start",
                            marginBottom: 8,
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderRadius: 10,
                            backgroundColor: bg,
                            borderLeftWidth: 3,
                            borderLeftColor: color,
                          }}
                        >
                          <Icon
                            size={18}
                            color={color}
                            style={{ marginTop: 2, marginRight: 8 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontWeight: "bold",
                                color: color,
                                marginBottom: 2,
                              }}
                            >
                              {suggestion.parameter}
                            </Text>
                            {formatInsightText(
                              limitWords(suggestion.recommendation, 20),
                              suggestion.status
                            )}{" "}
                            {/* Limit words to 8 and format */}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ color: "#6b7280", fontSize: 13 }}>
                      No recommendations available.
                    </Text>
                  )}
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
