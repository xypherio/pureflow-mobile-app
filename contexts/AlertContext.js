import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { addAlertToFirestore, fetchAllDocuments } from "../backend/firebase/firestore"; // <-- Import the fetch function
import { getAlertsFromSensorData } from "../utils/alertLogicHandler";

const AlertContext = createContext();

// Helper to generate a unique key for each alert
function alertKey(alert) {
  return `${alert.parameter}-${alert.type}-${alert.title}-${alert.value}`;
}

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [data, setData] = useState([]);
  const sentAlertKeysRef = useRef(new Set());

  useEffect(() => {
    let isMounted = true;
    const fetchData = () => {
      fetchAllDocuments("datm_data")
        .then(fetchedData => {
          if (isMounted) {
            setData(fetchedData);
            const newAlerts = getAlertsFromSensorData(fetchedData);
            setAlerts(newAlerts);

            // Only send alerts that haven't been sent before
            newAlerts.forEach(alert => {
              const key = alertKey(alert);
              if (!sentAlertKeysRef.current.has(key)) {
                addAlertToFirestore(alert);
                sentAlertKeysRef.current.add(key);
              }
            });

            // Remove keys that are no longer in the current alerts
            const currentKeys = new Set(newAlerts.map(alertKey));
            sentAlertKeysRef.current.forEach(key => {
              if (!currentKeys.has(key)) {
                sentAlertKeysRef.current.delete(key);
              }
            });
          }
        })
        .catch(error => {
          if (isMounted) {
            console.error("Error fetching sensor data:", error);
          }
        });
    };
    fetchData(); // initial fetch
    const interval = setInterval(fetchData, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const allAlerts = alerts;

  return (
    <AlertContext.Provider value={{ alerts, allAlerts, sensorData: data }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  return useContext(AlertContext);
} 