import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

const ChartTooltip = ({ data, visible, position, onHide }) => {
  useEffect(() => {
    let timeoutId;
    if (visible) {
      // Set timeout to hide tooltip after 5 seconds
      timeoutId = setTimeout(() => {
        onHide?.();
      }, 3000);
    }
    // Cleanup timeout when component unmounts or visibility changes
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [visible, onHide]);

  if (!visible || !data) return null;

  return (
    <View
      style={[
        styles.tooltip,
        {
          position: 'absolute',
          left: position.x,
          top: position.y,
        },
      ]}
    >
      <View style={styles.tooltipContent}>
        <Text style={styles.value}>
          {typeof data.value === 'number' ? data.value.toFixed(1) : data.value}
        </Text>
        <Text style={styles.parameter}>{data.parameter}</Text>
        <Text style={styles.timestamp}>{data.timestamp}</Text>
      </View>
      <View style={styles.arrow} />
    </View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    zIndex: 1000,
    elevation: 10,
  },
  tooltipContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 80,
    alignItems: 'center',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  parameter: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  arrow: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
  },
});

export default ChartTooltip;