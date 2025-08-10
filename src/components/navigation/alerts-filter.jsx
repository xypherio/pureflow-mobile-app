import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

const parameterFilters = [
  { label: 'All Parameters', value: 'all' },
  { label: 'pH', value: 'pH' },
  { label: 'Temperature', value: 'temperature' },
  { label: 'Turbidity', value: 'turbidity' },
  { label: 'Salinity', value: 'salinity' },
];

const severityFilters = [
  { label: 'All Alerts', value: 'all' },
  { label: 'Red Alerts', value: 'error' },
  { label: 'Warning', value: 'warning' },
  { label: 'Info', value: 'info' },
  { label: 'Normal', value: 'normal' },
];

const NotificationFilter = ({
  selectedAlert,
  selectedParam,
  onSelectAlert,
  onSelectParam,
}) => {
  const renderPills = (options, selected, onSelect) =>
    options.map((filter) => {
      const isActive = selected === filter.value;
      return (
        <TouchableOpacity
          key={filter.value}
          onPress={() => onSelect(filter.value)}
          style={{
            backgroundColor: isActive ? '#2455a9' : '#f3f4f6',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 999,
            marginRight: 8,
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: isActive ? '#fff' : '#374151',
              fontWeight: '500',
            }}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      );
    });

  return (
    <View style={{ marginBottom: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {renderPills(parameterFilters, selectedAlert, onSelectAlert)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {renderPills(severityFilters, selectedParam, onSelectParam)}
      </ScrollView>
    </View>
  );
};

export default NotificationFilter;
