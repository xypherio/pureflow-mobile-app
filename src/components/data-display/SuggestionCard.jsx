import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const statusColor = {
  normal: '#2ecc71',   // Green
  warning: '#f1c40f',  // Yellow
  critical: '#e74c3c', // Red
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#5499C7', // Neutral blue
  },
  insightText: {
    fontSize: 16,
    color: '#333',
  },
  recommendationText: {
    fontSize: 16,
    color: '#333',
  },
  status: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    top: 10,
    right: 10,
  },
});

const SuggestionCard = ({ suggestion }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>{suggestion.parameter}</Text>
      <Text style={styles.recommendationText}>{suggestion.recommendation}</Text>
      <View style={[styles.status, { backgroundColor: statusColor[suggestion.status] || '#95a5a6' }]} />
    </View>
  );
};

export default SuggestionCard;
