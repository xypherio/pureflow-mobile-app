import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { getAlertsFromSensorData } from "../app/utils/alertLogicHandler";
import { useFirestoreCollection } from "../hooks/useFirestoreCollection";
import { addAlert, getAllAlerts } from "../services/alertsService";

const AlertContext = createContext();

export function AlertProvider({ children }) {
  const { data, loading, error } = useFirestoreCollection("datm_data");
  const [alerts, setAlerts] = useState([]); // current (live) alerts
  const [history, setHistory] = useState([]); // persistent alert history
  const prevAlertKeys = useRef(new Set());

  // Fetch alert history from Firestore on mount
  useEffect(() => {
    getAllAlerts().then(setHistory);
  }, []);

  // Watch for new alerts and persist them
  useEffect(() => {
    const currentAlerts = getAlertsFromSensorData(data);
    setAlerts(currentAlerts);

    // Persist new alerts to Firestore
    currentAlerts.forEach(alert => {
      const key = `${alert.parameter}-${alert.type}-${alert.title}`;
      if (!prevAlertKeys.current.has(key)) {
        addAlert({ ...alert, timestamp: new Date() });
        prevAlertKeys.current.add(key);
      }
    });
  }, [data]);

  // For notifications tab: merge live alerts and history, remove duplicates
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
    <AlertContext.Provider value={{ alerts, allAlerts, loading, error, sensorData: data }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  return useContext(AlertContext);
} 