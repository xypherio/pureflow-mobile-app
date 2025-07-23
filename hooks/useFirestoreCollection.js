import { useEffect, useState } from "react";
import { formatSensorData } from "../app/utils/formatSensorData";
import { fetchAllDocuments } from "../firebase/firestore";

export function useFirestoreCollection(collectionName, intervalMs = 30000) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let intervalId;

    async function getData() {
      try {
        setLoading(true);
        const docs = await fetchAllDocuments(collectionName);
        const formatted = formatSensorData(docs);
        setData(formatted);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    getData(); // Initial fetch
    intervalId = setInterval(getData, intervalMs);

    return () => clearInterval(intervalId);
  }, [collectionName, intervalMs]);

  return { data, loading, error };
}