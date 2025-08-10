import { globalStyles } from '../../styles/globalStyles.js';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

const QUALITY_LEVELS = {
  excellent: {
    color: '#10B981',
    bg: '#D1FAE5',
    icon: CheckCircle,
    label: 'Excellent'
  },
  good: {
    color: '#059669',
    bg: '#D1FAE5',
    icon: CheckCircle,
    label: 'Good'
  },
  moderate: {
    color: '#D97706',
    bg: '#FEF3C7',
    icon: AlertCircle,
    label: 'Moderate'
  },
  poor: {
    color: '#DC2626',
    bg: '#FEE2E2',
    icon: AlertTriangle,
    label: 'Poor'
  }
};

export default function WaterQualitySummaryCard({ qualityLevel = 'good', lastUpdated = '2 hours ago' }) {
  const level = QUALITY_LEVELS[qualityLevel] || QUALITY_LEVELS.good;
  const IconComponent = level.icon;

  return (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: 20,
      marginVertical: 8,
      ...globalStyles.boxShadow,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <View style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: level.bg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16,
        }}>
          <IconComponent
            size={28}
            color={level.color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>
            Water Quality Status
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>
            Last updated: {lastUpdated}
          </Text>
        </View>
      </View>

      <View style={{
        backgroundColor: level.bg,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
      }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: level.color, marginBottom: 4 }}>
          {level.label}
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
          Your water quality is within acceptable parameters
        </Text>
      </View>
    </View>
  );
}
