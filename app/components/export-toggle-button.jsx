import { globalStyles } from '@styles/globalStyles';
import { FileSpreadsheet, FileText, Share } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const EXPORT_OPTIONS = [
  {
    id: 'pdf',
    icon: FileText,
    label: 'PDF',
    color: '#DC2626',
    bgColor: '#FEE2E2'
  },
  {
    id: 'csv',
    icon: FileSpreadsheet,
    label: 'CSV',
    color: '#059669',
    bgColor: '#D1FAE5'
  },
  {
    id: 'share',
    icon: Share,
    label: 'Share',
    color: '#D97706',
    bgColor: '#FEF3C7'
  }
];

export default function ExportToggleButton({ onExportAction }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleActionPress = (actionId) => {
    onExportAction?.(actionId);
    setIsExpanded(false);
  };

  return (
    <View style={{
      position: 'absolute',
      bottom: 110,
      right: 25,
      zIndex: 9999,
    }}>
      {/* Export Options */}
      {isExpanded && (
        <View style={{
          position: 'absolute',
          bottom: 70,
          right: 0,
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 8,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
          minWidth: 120,
        }}>
          {EXPORT_OPTIONS.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => handleActionPress(option.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  marginBottom: index < EXPORT_OPTIONS.length - 1 ? 4 : 0,
                }}
              >
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: option.bgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <IconComponent
                    size={16}
                    color={option.color}
                  />
                </View>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#374151',
                }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Main Toggle Button */}
      <TouchableOpacity
        onPress={handleToggle}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#2455a9',
          alignItems: 'center',
          justifyContent: 'center',
          ...globalStyles.boxShadow,
          elevation: 8,
        }}
      >
        {isExpanded ? (
          <FileText size={24} color="#fff" />
        ) : (
          <FileText size={24} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
} 