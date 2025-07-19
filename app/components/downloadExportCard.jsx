import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function DownloadExportCard({ onDownload }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Download / Export</Text>
      <TouchableOpacity
        style={[styles.button, !onDownload && styles.buttonDisabled]}
        onPress={onDownload || (() => {})}
        disabled={!onDownload}
      >
        <Text style={styles.buttonText}>Download Report</Text>
      </TouchableOpacity>
      {!onDownload && (
        <Text style={styles.comingSoon}>[Download/Export functionality coming soon]</Text>
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
    alignItems: 'flex-start',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonDisabled: {
    backgroundColor: '#a5b4fc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  comingSoon: {
    color: '#6b7280',
    marginTop: 8,
  },
}); 