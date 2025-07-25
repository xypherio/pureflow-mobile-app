import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useFirestoreCollection } from "../backend/hooks/useFirestoreCollection";
import { addAlert, getAllAlerts } from "../backend/services/alertsService";
import { getAlertsFromSensorData } from "../utils/alertLogicHandler";

const AlertContext = createContext();

export function AlertProvider({ children }) {
  const { data } = useFirestoreCollection("datm_data");
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const prevAlertKeys = useRef(new Set());

  // Fetch alert history from Firestore on mount
  useEffect(() => {
    getAllAlerts().then(setHistory);
  }, []);

  // Watch for new data and generate alerts
  useEffect(() => {
    const currentAlerts = getAlertsFromSensorData(data); // checks all parameters
    setAlerts(currentAlerts);

    // For each alert, check if it's new (not in prevAlertKeys)
    currentAlerts.forEach(alert => {
      // Add value and threshold to alert object for Firestore
      const key = `${alert.parameter}-${alert.type}-${alert.title}`;
      if (!prevAlertKeys.current.has(key)) {
        addAlert({
          ...alert,
          timestamp: new Date(),
          value: alert.value, // ensure value is included
          threshold: alert.threshold, // ensure threshold is included
          acknowledged: false
        });
        prevAlertKeys.current.add(key);
      }
    });
  }, [data]);

  // Merge live alerts and history, remove duplicates
  const allAlerts = React.useMemo(() => {
    const map = new Map();
    history.forEach(a => {
      const key = `${a.parameter}-${a.type}-${a.title}`;
      map.set(key, a);
    });
    alerts.forEach(a => {
      const key = `${a.parameter}-${a.type}-${a.title}`;
      map.set(key, a);
    });
    return Array.from(map.values());
  }, [alerts, history]);

  return (
    <AlertContext.Provider value={{ alerts, allAlerts, sensorData: data }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  return useContext(AlertContext);
} 