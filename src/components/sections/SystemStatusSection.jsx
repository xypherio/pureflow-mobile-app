import React from "react";
import { StyleSheet, View } from "react-native";
import StatusCard from "@ui/DeviceStatusCard";

/**
 * @param {Object} props - Component props
 * @param {boolean} props.isDatmActive - DATM active status
 * @param {boolean} props.isSolarPowered - Solar power status
 * @param {number} props.isRaining - Weather/rain status
 * @param {number|null} props.deviceHumidity - Device humidity from Firebase
 * @param {number|null} props.datmTemp - DATM temperature from Firebase
 */
const SystemStatusSection = ({ isDatmActive, isSolarPowered, isRaining, deviceHumidity, datmTemp }) => {


  return (
    <View style={styles.container}>
      <StatusCard
        isDatmActive={isDatmActive}
        isRaining={isRaining}
        humidity={deviceHumidity}
        temperature={datmTemp}
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
