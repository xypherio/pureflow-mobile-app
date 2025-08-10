import { View, Text, StyleSheet } from "react-native";

export default function SuggestionsCard({ suggestions = [] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Suggestions</Text>
      {suggestions.length === 0 ? (
        <Text style={styles.noSuggestion}>All systems normal. No suggestions.</Text>
      ) : (
        suggestions.map((suggestion, idx) => (
          <Text key={idx} style={styles.suggestion}>• {suggestion}</Text>
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
  noSuggestion: {
    color: '#6b7280',
  },
  suggestion: {
    color: '#15803d',
    marginBottom: 4,
  },
}); 