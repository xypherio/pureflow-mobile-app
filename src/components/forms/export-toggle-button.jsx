import * as Haptics from 'expo-haptics';
import { FileSpreadsheet, FileText, Share } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { handleExport } from '../../utils/exportUtils';

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

export default function ExportToggleButton({ 
  reportData = {},
  componentRef,
  onExportStart,
  onExportComplete,
  onExportError
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeExport, setActiveExport] = useState(null);
  const buttonRef = useRef();

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(prev => !prev);
  }, []);

  const handleExportAction = useCallback(
    async (actionId) => {
      console.log('Export action triggered:', actionId);
      console.log('Component ref in handler:', componentRef);
      
      if (!componentRef) {
        const error = new Error('Component reference is undefined');
        console.error(error);
        Alert.alert('Error', 'Component reference is not available for export');
        onExportError?.(actionId, error);
        return;
      }

      try {
        setLoading(true);
        console.log('Starting export with data:', { actionId, hasReportData: !!reportData });
        
        await handleExport(actionId, {
          reportData,
          componentRef,
          onStart: onExportStart,
          onComplete: onExportComplete,
          onError: onExportError,
        });
        
        console.log('Export completed successfully');
      } catch (error) {
        console.error('Export error:', error);
        onExportError?.(actionId, error);
      } finally {
        setLoading(false);
      }
    },
    [reportData, componentRef, onExportStart, onExportComplete, onExportError]
  );

  const handleActionPress = useCallback((actionId) => {
    handleExportAction(actionId);
  }, [handleExportAction]);

  const renderButtonContent = (option) => {
    if (isExporting && activeExport === option.id) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="small" 
            color={option.color} 
            style={styles.loadingSpinner} 
          />
        </View>
      );
    }
    
    const Icon = option.icon;
    return (
      <View style={[styles.iconContainer, { backgroundColor: option.bgColor }]}>
        <Icon size={18} color={option.color} />
      </View>
    );
  };

  return (
    <View style={styles.container} ref={buttonRef}>
      {/* Export Options */}
      {isExpanded && (
        <View style={{
          position: 'absolute',
          bottom: 60,
          right: -5,
          borderRadius: 12,
          padding: 8,
        }}>
          {EXPORT_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionButton, { backgroundColor: option.bgColor }]}
              onPress={() => handleActionPress(option.id)}
              disabled={isExporting}
              activeOpacity={0.7}
            >
              {renderButtonContent(option)}
              <Text style={[styles.optionText, { color: option.color }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Main Button */}
      <TouchableOpacity
        style={[styles.mainButton, isExpanded && styles.mainButtonExpanded]}
        onPress={handleToggle}
        disabled={isExporting}
        activeOpacity={0.8}
      >
        {isExporting && activeExport ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : isExpanded ? (
          <FileText size={24} color="#fff" />
        ) : (
          <FileText size={24} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2455a9',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mainButtonExpanded: {
    backgroundColor: '#ef4444',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: 100,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  loadingSpinner: {
    marginRight: 0,
  },
});