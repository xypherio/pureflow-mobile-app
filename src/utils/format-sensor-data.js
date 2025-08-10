export function formatSensorData(docs) {

  return docs
    .map(doc => ({
      ph: doc.pH,
      temperature: doc.temperature,
      tds: doc.turbidity, 
      salinity: doc.salinity,
      timestamp: doc.timestamp,
      isRaining: doc.isRaining,
    }))
    .sort((a, b) => {

      const aTime = a.timestamp?.toMillis ? a.timestamp.toMillis() : a.timestamp;
      const bTime = b.timestamp?.toMillis ? b.timestamp.toMillis() : b.timestamp;
      return aTime - bTime; 
    });
} 