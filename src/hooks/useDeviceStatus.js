/**
 * Custom hook for device status calculations
 *
 * Provides computed values for device status indicators based on realtime data
 */

import { useMemo } from "react";
import { validateSensorData, isDataFresh } from "../utils/sensorDataUtils";

/**
 * Hook for computing device status values
 * @param {Object} realtimeData - Real-time sensor data from context
 * @returns {Object} Computed device status values
 */
export const useDeviceStatus = (realtimeData) => {
  return useMemo(() => {
    // Check if we have valid sensor data and it's fresh (within 1 minute)
    const hasValidData = validateSensorData(realtimeData);
    const isFresh = isDataFresh(realtimeData, 60); // 60 seconds = 1 minute

    // DATM is active if data is both valid and fresh
    const datmActive = hasValidData && isFresh;

    // Solar power status from Firebase field (default to true if not present)
    const solarPowered = realtimeData?.isSolarPowered !== undefined
      ? Boolean(realtimeData.isSolarPowered)
      : true;

    return {
      isDatmActive: datmActive,
      isSolarPowered: solarPowered,
    };
  }, [realtimeData]);
};
