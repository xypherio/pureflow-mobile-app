import { globalStyles } from "@styles/globalStyles.js";
import { Settings } from "lucide-react-native";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

const LOGO_PATH = require("../../../assets/logo/pureflow-logo.png");

export default function PureFlowLogo({
  style,
  onSettingsPress,
  notificationBadge,
  ...otherProps
}) {
  const handleSettingsPress = () => {
    if (onSettingsPress) {
      onSettingsPress();
    }
  };

  return (
    <View style={styles.container}>
      {/* PureFlow Logo */}
      <Image
        source={LOGO_PATH}
        style={[globalStyles.logo, style]}
        accessibilityLabel="pureflow_logo"
        {...otherProps}
      />

      {/* Settings Icon */}
      <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsContainer}>
        <Settings size={24} color="#2455a9" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 30,
    backgroundColor: "#e5f0f9",
    zIndex: 9999,
  },
  settingsContainer: {
    marginLeft: 16,
    padding: 8,
    borderRadius: 20,
  },
});
