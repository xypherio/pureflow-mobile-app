import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

const alertFilters = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Read', value: 'read' },
  { label: 'Red Alert', value: 'red' },
  { label: 'Yellow Alert', value: 'yellow' },
  { label: 'Green Alert', value: 'green' },
  { label: 'Blue Alert', value: 'blue' },
];

const parameterFilters = [
  { label: 'All Parameters', value: 'all' },
  { label: 'pH', value: 'ph' },
  { label: 'Temp', value: 'temperature' },
  { label: 'TDS', value: 'tds' },
  { label: 'Salinity', value: 'salinity' },
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
        {renderPills(alertFilters, selectedAlert, onSelectAlert)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {renderPills(parameterFilters, selectedParam, onSelectParam)}
      </ScrollView>
    </View>
  );
};

export default NotificationFilter;
