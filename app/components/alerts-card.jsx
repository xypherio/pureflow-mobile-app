import { StyleSheet, Text, View } from "react-native";

export default function AlertsCard({ alerts = [] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Alerts</Text>
      {alerts.length === 0 ? (
        <Text style={styles.noAlert}>No alerts at this time.</Text>
      ) : (
        alerts.map((alert, idx) => (
          <Text key={idx} style={styles.alert}>• {alert}</Text>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  noAlert: {
    color: '#6b7280',
  },
  alert: {
    color: '#dc2626',
    marginBottom: 4,
  },
}); 