import { Download, FileText, Printer, Share } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const ACTION_CONFIG = {
  download: {
    icon: Download,
    bgColor: '#DBEAFE',
    iconColor: '#2563EB',
    label: 'Download Report'
  },
  export: {
    icon: FileText,
    bgColor: '#D1FAE5',
    iconColor: '#059669',
    label: 'Export Data'
  },
  share: {
    icon: Share,
    bgColor: '#FEF3C7',
    iconColor: '#D97706',
    label: 'Share Report'
  },
  print: {
    icon: Printer,
    bgColor: '#E0E7FF',
    iconColor: '#7C3AED',
    label: 'Print Report'
  }
};

export default function ReportActionCard({ action, onPress, disabled = false }) {
  const config = ACTION_CONFIG[action] || ACTION_CONFIG.download;
  const IconComponent = config.icon;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        margin: 4,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: config.bgColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}>
          <IconComponent
            size={24}
            color={config.iconColor}
          />
        </View>
        
        <Text style={{ 
          fontSize: 14, 
          fontWeight: '600', 
          color: '#374151',
          textAlign: 'center'
        }}>
          {config.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
} 