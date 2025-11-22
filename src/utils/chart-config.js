import { Droplet, Gauge, Thermometer, Waves } from 'lucide-react-native';
import { colors } from '../constants/colors';

export const chartYAxisConfig = {
  pH: { min: 0, max: 14, interval: 2 },
  temperature: { min: 5, max: 70, interval: 10 },
  turbidity: { min: 0, max: 70, interval: 10 },
  salinity: { min: 0, max: 35, interval: 5 },
  default: { min: 0, max: 80, interval: 20 },
};

export const getDefaultChartConfig = (parameter) => {
  const yAxisConfig = parameter ? 
    chartYAxisConfig[parameter] : 
    chartYAxisConfig.default;

  return {
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.background,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: colors.primary || '#2455A9',
    },
    // Add Y-axis configuration
    yAxisMin: yAxisConfig.min,
    yAxisMax: yAxisConfig.max,
    yAxisInterval: yAxisConfig.interval,
  };
};

export const getChartDatasetConfig = (parameter) => ({
  strokeWidth: 3,
  color: (opacity = 1) => {
    const paramColor = colors.chart[parameter.toLowerCase()] || colors.primary;
    return `${paramColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  },
});

export const getParameterOptions = () => [
  { label: <Gauge size={20} color={'#007bff'} />, value: 'pH' },
  { label: <Thermometer size={20} color={'#e83e8c'} />, value: 'temperature' },
  { label: <Waves size={20} color={'#28a745'} />, value: 'turbidity' },
  { label: <Droplet size={20} color={'#8b5cf6'} />, value: 'salinity' }
];

export const CHART_PARAMETERS = ["pH", "temperature", "turbidity", "salinity"];

export const CHART_DIMENSIONS = {
  height: 230,
  widthOffset: 0,
  containerWidth: 25,
};
