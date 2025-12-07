import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { Bug, Droplets, Save, Star, X } from "lucide-react-native";
import { colors } from "../../constants/colors";
import { checkUserRated } from "../../services/firebase/ratingService";

const SettingsModal = ({ visible, onClose, onRateApp, onReportIssue, onCityChange }) => {
  const [settings, setSettings] = useState({
    nickname: "",
    fishpondType: "freshwater",
    customCity: "",
    setupTimestamp: null
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupLocked, setSetupLocked] = useState(false);
  const [daysUntilUnlock, setDaysUntilUnlock] = useState(0);
  const [hasUserRated, setHasUserRated] = useState(false);

  useEffect(() => {
    const loadSettingsAndRating = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem("pureflowSettings");
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);

          if (parsedSettings.setupTimestamp) {
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
            const timeSinceSetup = Date.now() - parsedSettings.setupTimestamp;
            const daysRemaining = Math.ceil(
              (sevenDaysMs - timeSinceSetup) / (24 * 60 * 60 * 1000)
            );

            if (timeSinceSetup < sevenDaysMs) {
              setSetupLocked(true);
              setDaysUntilUnlock(Math.max(1, daysRemaining));
            } else {
              setSetupLocked(false);
              setDaysUntilUnlock(0);
            }
          }

          setSettings(parsedSettings);
        }

        const userHasRated = await checkUserRated();
        setHasUserRated(userHasRated);
      } catch (error) {
        console.error("Error loading settings or rating status:", error);
      }
    };

    if (visible) {
      loadSettingsAndRating();
    }
  }, [visible]);

  const handleRateApp = () => {
    onClose();
    onRateApp();
  };

  const handleReportIssue = () => {
    onClose();
    onReportIssue();
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const originalCity = settings.customCity;

      let updatedSettings = { ...settings };
      if (
        !settings.setupTimestamp &&
        (settings.nickname || settings.fishpondType || settings.customCity)
      ) {
        updatedSettings.setupTimestamp = Date.now();
        setSettings(updatedSettings);
      }

      await AsyncStorage.setItem(
        "pureflowSettings",
        JSON.stringify(updatedSettings)
      );

      const cityChanged = updatedSettings.customCity !== originalCity;

      if (cityChanged && onCityChange) {
        setIsSettingUp(true);
        try {
          await onCityChange();
        } catch (error) {
          console.error("Error setting up weather:", error);
          Alert.alert("Setup Warning", "Weather setup had an issue, but your settings were saved. Weather may update on next restart.");
        } finally {
          setIsSettingUp(false);
        }
      }

      const changes = [];
      if (cityChanged) changes.push("weather location updated");

      let message = "Your settings have been saved successfully!";
      if (changes.length > 0) {
        message += " (" + changes.join(", ") + ")";
      }

      Alert.alert(
        "Settings Saved",
        message,
        [{ text: "OK", onPress: onClose }]
      );
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <>
      {isSettingUp && (
        <Modal visible={isSettingUp} transparent={true}>
          <View style={styles.setupOverlay}>
            <View style={styles.setupContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.setupText}>Setting up...</Text>
            </View>
          </View>
        </Modal>
      )}

      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Settings</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Fishpond Setup</Text>
                  {setupLocked && (
                    <Text style={styles.lockedText}>
                      * Can edit again in {daysUntilUnlock} days *
                    </Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Custom Alias/Nickname</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      setupLocked && styles.inputDisabled,
                    ]}
                    placeholder="My Alias"
                    value={settings.nickname}
                    onChangeText={(text) =>
                      !setupLocked &&
                      setSettings((prev) => ({ ...prev, nickname: text }))
                    }
                    maxLength={50}
                    editable={!setupLocked}
                  />
                </View>

                <View style={styles.pickerContainer}>
                  <Text style={styles.inputLabel}>Water Type</Text>
                  <View style={styles.pickerButtons}>
                    <TouchableOpacity
                      style={[
                        styles.pickerButton,
                        settings.fishpondType === "freshwater" &&
                          styles.pickerButtonActive,
                        setupLocked && styles.pickerDisabled,
                      ]}
                      onPress={() =>
                        !setupLocked &&
                        setSettings((prev) => ({
                          ...prev,
                          fishpondType: "freshwater",
                        }))
                      }
                      disabled={setupLocked}
                    >
                      <Droplets
                        size={16}
                        color={
                          settings.fishpondType === "freshwater"
                            ? colors.white
                            : colors.primary
                        }
                      />
                      <Text
                        style={[
                          styles.pickerText,
                          settings.fishpondType === "freshwater" &&
                            styles.pickerTextActive,
                        ]}
                      >
                        Freshwater
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.pickerButton,
                        settings.fishpondType === "saltwater" &&
                          styles.pickerButtonActive,
                        setupLocked && styles.pickerDisabled,
                      ]}
                      onPress={() =>
                        !setupLocked &&
                        setSettings((prev) => ({
                          ...prev,
                          fishpondType: "saltwater",
                        }))
                      }
                      disabled={setupLocked}
                    >
                      <Text
                        style={[
                          styles.pickerEmoji,
                          settings.fishpondType === "saltwater" &&
                            styles.pickerEmojiActive,
                        ]}
                      >
                        🌊
                      </Text>
                      <Text
                        style={[
                          styles.pickerText,
                          settings.fishpondType === "saltwater" &&
                            styles.pickerTextActive,
                        ]}
                      >
                        Saltwater
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>City for Weather (Optional)</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      setupLocked && styles.inputDisabled,
                    ]}
                    placeholder="Bogo City"
                    value={settings.customCity}
                    onChangeText={(text) =>
                      !setupLocked &&
                      setSettings((prev) => ({ ...prev, customCity: text }))
                    }
                    maxLength={100}
                    editable={!setupLocked}
                  />
                  <Text style={styles.helpText}>
                    Leave empty to use default location. Weather data will update immediately when saved.
                  </Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Other Options</Text>
                </View>

                <View style={styles.optionsContainer}>
                  {!hasUserRated && (
                    <TouchableOpacity style={styles.optionButton} onPress={handleRateApp}>
                      <Star size={20} color={colors.primary} />
                      <Text style={styles.optionButtonText}>Rate PureFlow</Text>
                    </TouchableOpacity>
                  )}

                  {hasUserRated && (
                    <View style={styles.optionButtonDisabled}>
                      <Star size={20} color="#9CA3AF" />
                      <Text style={styles.optionButtonTextDisabled}>Already Rated!</Text>
                      <Text style={styles.feedbackSubmitted}> ❤️ Thanks for your feedback</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.optionButton} onPress={handleReportIssue}>
                    <Bug size={20} color={colors.primary} />
                    <Text style={styles.optionButtonText}>Report Issue</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {!setupLocked && (
              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleClose}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Save size={18} color={colors.white} style={styles.saveIcon} />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
    minHeight: "76%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  lockedText: {
    fontSize: 13,
    color: colors.primaryDark,
    marginLeft: 8,
    marginTop: 2,
    fontStyle: "italic",
  },
  inputDisabled: {
    backgroundColor: colors.surfaceSecondary,
    color: colors.textSecondary,
  },
  pickerDisabled: {
    opacity: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginLeft: 12,
  },
  optionButtonDisabled: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  optionButtonTextDisabled: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 12,
  },
  feedbackSubmitted: {
    fontSize: 12,
    color: "#EF4444",
    fontStyle: "italic",
    position: "absolute",
    right: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  pickerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  pickerButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginLeft: 8,
  },
  pickerTextActive: {
    color: colors.white,
  },
  pickerEmoji: {
    fontSize: 16,
  },
  pickerEmojiActive: {
    color: colors.white,
  },
  buttonsContainer: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
    marginLeft: 8,
  },
  saveIcon: {
    marginRight: 8,
  },
  setupOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.blur,
    justifyContent: "center",
    alignItems: "center",
  },
  setupContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    elevation: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  setupText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
});

export default SettingsModal;
