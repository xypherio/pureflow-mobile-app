import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { formatSensorData } from "../../utils/formatSensorData";

export const useFirestoreCollection = (query) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query) return;

    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const formattedData = formatSensorData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setData(formattedData);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [JSON.stringify(query)]);

  return { data, loading, error };
};
