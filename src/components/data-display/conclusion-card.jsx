// src/components/data-display/ConclusionCard.jsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const statusIcons = {
  normal: { name: 'check-circle', color: '#059669' },
  caution: { name: 'alert-circle', color: '#d97706' },
  critical: { name: 'alert-octagon', color: '#dc2626' }
};

const ConclusionCard = ({ 
  overallStatus = 'normal', 
  conclusion, 
  recommendations = [],
  style 
}) => {
  const status = statusIcons[overallStatus] || statusIcons.normal;
  
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${status.color}15` }]}>
          <MaterialCommunityIcons 
            name={status.name} 
            size={24} 
            color={status.color} 
          />
        </View>
        <Text style={[styles.title, { color: status.color }]}>
          {overallStatus === 'normal' ? 'Good Water Quality' : 
           overallStatus === 'caution' ? 'Needs Attention' : 'Critical Alert'}
        </Text>
      </View>
      
      <Text style={styles.conclusion}>{conclusion}</Text>
      
      {recommendations.length > 0 && (
        <View style={styles.recommendations}>
          <Text style={styles.recommendationsTitle}>Recommendations:</Text>
          {recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <MaterialCommunityIcons 
                name="check-circle" 
                size={16} 
                color={status.color} 
                style={styles.bulletIcon}
              />
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  conclusion: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  recommendations: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bulletIcon: {
    marginRight: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
});

export default ConclusionCard;