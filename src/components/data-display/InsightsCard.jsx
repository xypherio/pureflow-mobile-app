import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
});

const InsightsCard = ({ insight }) => {
  return (
    <View style={stylesheet.card}>
      <Text style={stylesheet.header}>AI Insights</Text>
      <Text style={stylesheet.insightText}>{insight}</Text>
    </View>
  );
};

const stylesheet = StyleSheet.create({
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
});

export default InsightsCard;
