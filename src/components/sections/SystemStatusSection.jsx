/**
 * System Status Section Component
 *
 * Displays device status and connection information
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import StatusCard from "@ui/DeviceStatusCard";

/**
 * Section displaying system/device status information
 * @param {Object} props - Component props
 * @param {boolean} props.isDatmActive - DATM active status
 * @param {boolean} props.isSolarPowered - Solar power status
 * @param {number} props.isRaining - Weather/rain status
 */
const SystemStatusSection = ({ isDatmActive, isSolarPowered, isRaining }) => {
  return (
    <View style={styles.container}>
      <StatusCard
        status="Active"
        battery="Low"
        solarPowered={isSolarPowered}
        isDatmActive={isDatmActive}
        isRaining={isRaining}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
});

export default React.memo(SystemStatusSection);
