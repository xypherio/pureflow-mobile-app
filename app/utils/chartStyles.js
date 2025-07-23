import { Platform } from 'react-native';

export const chartStyles = {
  container: {
    borderRadius: 12,
    ...(Platform.OS === 'web' && {
      transform: 'none',
    }),
  },
  chartConfig: {
    backgroundColor: "#2455a9",
    backgroundGradientFrom: "#2455a9",
    backgroundGradientTo: "#2455a9",
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 0,
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    paddingBottom: 20,
    noOfSections: 5,
  },
}; 

export default chartStyles;