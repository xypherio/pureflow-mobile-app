import { globalStyles } from "@styles/globalStyles.js";
import { CloudRain, CloudSun, Sun } from "lucide-react-native";
import { useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";

const LOGO_PATH = require("../../../assets/logo/pureflow-logo.png");

const weatherIconMap = {
  rain: <CloudRain size={24} color="#3b82f6" />,
  sunny: <Sun size={24} color="#fbbf24" />,
  partly: <CloudSun size={24} color="#facc15" />,
};

export default function PureFlowLogo({
  weather = { label: "Light Rain", temp: "30°C", icon: "rain" },
  style,
  ...props
}) {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <View style={styles.container}>
      {/* PureFlow Logo */}
      <Pressable onPress={() => setModalVisible(true)}>
        <Image
          source={LOGO_PATH}
          style={[globalStyles.logo, style]}
          accessibilityLabel="pureflow_logo"
          {...props}
        />
      </Pressable>

      {/* Weather Info */}
      <View style={styles.weatherContainer}>
        {weatherIconMap[weather.icon] || (
          <CloudRain size={24} color="#3b82f6" />
        )}
        <View style={styles.weatherTextContainer}>
          <Text style={styles.weatherLabel}>{weather.label}</Text>
          <Text style={styles.weatherTemp}>{weather.temp}</Text>
        </View>
      </View>

      {/* App Info Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Image
              source={LOGO_PATH}
              style={styles.modalLogo}
              accessibilityLabel="pureflow_logo"
            />
            <Text style={styles.modalTitle}>PureFlow Mobile</Text>
            <Text style={styles.modalVersion}>Version 1.0.0</Text>
            <Text style={styles.modalDescription}>
              Water quality monitoring and analysis application.
            </Text>
            <Text style={styles.modalCopyright}>
              © {new Date().getFullYear()} PureFlow. All rights reserved.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = {
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
  weatherContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  weatherTextContainer: {
    marginLeft: 8
  },
  weatherLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b"
  },
  weatherTemp: {
    fontSize: 11,
    color: "#64748b"
  },
  modalOverlay: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(48, 76, 120, 0.3)',
    zIndex: 999,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#e5f0f9',
    padding: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  modalLogo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a2d51',
    marginBottom: 8,
  },
  modalVersion: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalCopyright: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
};
