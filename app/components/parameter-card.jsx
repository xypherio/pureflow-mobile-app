import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

const STATUS_STYLES = {
  normal: {
    backgroundColor: '#22c55e', // green
    icon: 'check-circle',
    title: 'Normal',
    label: 'Normal',
  },
  moderate: {
    backgroundColor: '#eab308', // yellow
    icon: 'alert-circle',
    title: 'Moderate',
    label: 'Moderate',
  },
  critical: {
    backgroundColor: '#ef4444', // red
    icon: 'alert-octagon',
    title: 'High',
    label: 'Critical',
  },
};

const ICON_MAP = {
  pH: 'flask',
  Temperature: 'thermometer',
  Turbidity: 'water',
  Salinity: 'waves',
  TDS: 'water-percent',
  EC: 'flash',
};

export default function ParameterCard({ icon, label, value, unit, status, location }) {
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.normal;
  // Dynamic title: e.g., 'High pH Level', 'Moderate pH Level', 'Normal pH Level'
  const title = `${statusStyle.title} ${label || 'Parameter'}`;
  // Dynamic description: e.g., 'Detected pH level of 9.1 in Pond B.'
  const description = `Detected ${(label || 'parameter').toLowerCase()} of ${value}${unit ? ' ' + unit : ''}${location ? ' in ' + location : ''}.`;

  return (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 12,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
      position: 'relative',
      minHeight: 100,
    }}>
      {/* Status Pill */}
      <View style={{
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: statusStyle.backgroundColor,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        zIndex: 2,
      }}>
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 10 }}>{statusStyle.label}</Text>
      </View>
      
      {/* Icon Circle */}
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: statusStyle.backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        alignSelf: 'center',
      }}>
        <MaterialCommunityIcons
          name={ICON_MAP[icon] || 'flask'}
          size={20}
          color="#fff"
        />
      </View>
      
      {/* Content */}
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 4, textAlign: 'center' }}>
          {label}
        </Text>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: statusStyle.backgroundColor, marginBottom: 2 }}>
          {value}{unit}
        </Text>
        <Text style={{ fontSize: 11, color: '#666', textAlign: 'center' }}>
          {statusStyle.title}
        </Text>
      </View>
    </View>
  );
}