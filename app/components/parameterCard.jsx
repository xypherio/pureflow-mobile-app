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
  const title = `${statusStyle.title} ${label}`;
  // Dynamic description: e.g., 'Detected pH level of 9.1 in Pond B.'
  const description = `Detected ${label.toLowerCase()} of ${value}${unit ? ' ' + unit : ''}${location ? ' in ' + location : ''}.`;

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 16,
      marginVertical: 8,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
      minHeight: 80,
      position: 'relative',
    }}>
      {/* Status Pill */}
      <View style={{
        position: 'absolute',
        top: 12,
        right: 16,
        backgroundColor: statusStyle.backgroundColor,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 3,
        zIndex: 2,
        alignSelf: 'flex-start',
      }}>
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{statusStyle.label}</Text>
      </View>
      {/* Icon Circle */}
      <View style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: statusStyle.backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
      }}>
        <MaterialCommunityIcons
          name={ICON_MAP[icon] || 'flask'}
          size={28}
          color="#fff"
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontSize: 14, color: '#555' }}>{description}</Text>
      </View>
    </View>
  );
}