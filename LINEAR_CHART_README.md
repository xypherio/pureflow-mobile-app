# Linear Chart System Documentation

## Overview
The linear chart system provides real-time and historical water quality data visualization for both the home tab and reports tab. It features intelligent data aggregation, caching, and interactive tooltips.

## Components

### 1. LinearChart (Core Component)
**File:** `src/components/data-display/LinearChart.jsx`

The main chart component that handles both home and reports tab data visualization.

**Props:**
- `type`: 'home' or 'reports' - determines chart behavior
- `timeFilter`: 'daily', 'weekly', 'monthly', 'annually' - for reports tab
- `selectedParameter`: null or parameter name - for home tab filtering
- `height`: number - chart height in pixels
- `showLegend`: boolean - whether to show parameter legend
- `onDataPointPress`: function - callback when user taps chart points

**Usage:**
```jsx
import LinearChart from './LinearChart';

<LinearChart
  type="home"
  selectedParameter="pH"
  height={300}
  showLegend={true}
  onDataPointPress={(data, index) => console.log(data)}
/>
```

### 2. LineChartCard (Home Tab)
**File:** `src/components/data-display/linechart-card.jsx`

Enhanced chart card for the home tab with parameter filtering using segmented controls.

**Features:**
- Parameter filtering (All, pH, Temperature, Turbidity, Salinity)
- Real-time data updates every 5 minutes
- Shows all readings for current day (limited to last 50 to avoid clutter)
- Interactive tooltips on data point tap

**Usage:**
```jsx
import LineChartCard from './linechart-card';

<LineChartCard 
  title="Water Quality Trends" 
  height={350} 
/>
```

### 3. ReportsChart (Reports Tab)
**File:** `src/components/data-display/reports-chart.jsx`

Chart component for the reports tab with time range filtering.

**Features:**
- Time range filters: Daily, Weekly, Monthly, Annual
- Data aggregation based on selected time range
- Interactive tooltips
- Automatic data fetching based on filter changes

**Usage:**
```jsx
import ReportsChart from './reports-chart';

<ReportsChart 
  title="Water Quality Reports" 
  height={350} 
/>
```

### 4. ChartTooltip
**File:** `src/components/ui/ChartTooltip.jsx`

Interactive tooltip that displays parameter values when users tap chart points.

**Features:**
- Color-coded parameter display
- Timestamp formatting
- Unit display for each parameter
- Responsive positioning

## Data Management

### HistoricalDataService
**File:** `src/services/historicalDataService.js`

Service for efficient Firestore data access and caching.

**Key Methods:**
- `getCurrentDayData()`: Fetches all readings for current day
- `getAggregatedData(timeFilter, startDate, endDate)`: Fetches aggregated data for reports
- `getDateRange(timeFilter)`: Calculates date ranges for different time filters

**Data Aggregation:**
- **Daily**: 2-hour intervals with averaging
- **Weekly**: Daily averages (Monday to Sunday)
- **Monthly**: Daily averages for current month
- **Annual**: Monthly averages for current year

### useChartData Hook
**File:** `src/hooks/useChartData.js`

Custom hook for managing chart data state and fetching.

**Features:**
- Automatic data fetching
- Caching with offline-first approach
- Error handling with fallback to cached data
- Auto-refresh for home tab (every 5 minutes)

**Usage:**
```jsx
import { useChartData } from '../hooks/useChartData';

const { chartData, loading, error, lastUpdated, hasData } = useChartData(
  'home', // or 'reports'
  'daily', // time filter for reports
  null // selected parameter for home
);
```

## Data Structure

### Chart Data Format
```javascript
{
  dateTime: Date,
  pH: number | null,
  temperature: number | null,
  turbidity: number | null,
  salinity: number | null
}
```

### Tooltip Data Format
```javascript
{
  timestamp: Date,
  values: {
    pH: number,
    temperature: number,
    turbidity: number,
    salinity: number
  }
}
```

## Color Scheme

The chart uses consistent colors matching the realtime data cards:
- **pH**: #FF6B6B (Red)
- **Temperature**: #4ECDC4 (Teal)
- **Turbidity**: #45B7D1 (Blue)
- **Salinity**: #96CEB4 (Green)

## Caching Strategy

- **Cache Duration**: 24 hours
- **Offline-First**: Shows cached data immediately while fetching fresh data
- **Automatic Cleanup**: Expired cache entries are removed every hour
- **Fallback**: Uses cached data when Firebase connection fails

## Error Handling

- **No Data**: Shows "No data available for now" message
- **Connection Issues**: Displays cached data with "Unable to load data at the moment" notice
- **Missing Parameters**: Skips parameters with no readings in selected time range

## Performance Features

- **Data Limiting**: Home tab shows only last 50 readings to prevent clutter
- **Efficient Aggregation**: Data is aggregated on the service level
- **Memoized Calculations**: Chart data preparation is memoized for performance
- **Lazy Loading**: Data is fetched only when needed

## Integration Examples

### Home Tab Integration
```jsx
// In your home tab component
import LineChartCard from '../components/data-display/linechart-card';

export default function HomeTab() {
  return (
    <View>
      <LineChartCard />
      {/* Other components */}
    </View>
  );
}
```

### Reports Tab Integration
```jsx
// In your reports tab component
import ReportsChart from '../components/data-display/reports-chart';

export default function ReportsTab() {
  return (
    <View>
      <ReportsChart />
      {/* Other components */}
    </View>
  );
}
```

## Customization

### Adding New Parameters
1. Update the `parameters` array in `historicalDataService.js`
2. Add new colors to the `chartColors` object in `LinearChart.jsx`
3. Update the `parameterOptions` in `linechart-card.jsx`

### Modifying Time Filters
1. Update the `timeFilterOptions` in `reports-chart.jsx`
2. Add new aggregation logic in `historicalDataService.js`
3. Update the `getDateRange` method for new time periods

### Styling Changes
- Chart colors: Modify `chartColors` in `LinearChart.jsx`
- Component styling: Update StyleSheet objects in respective components
- Global colors: Modify `src/constants/colors.js`

## Troubleshooting

### Common Issues

1. **Chart not displaying data**
   - Check Firebase connection
   - Verify data exists in Firestore
   - Check console for errors

2. **Tooltip not showing**
   - Ensure `onDataPointPress` callback is provided
   - Check tooltip positioning

3. **Performance issues**
   - Reduce chart height
   - Limit data points (already implemented for home tab)
   - Check cache settings

### Debug Mode
Enable console logging by checking the browser/React Native debugger for:
- Data fetching logs
- Cache operations
- Error messages

## Future Enhancements

- **Zoom/Pan**: Add chart zooming and panning capabilities
- **Export**: Add chart data export functionality
- **Annotations**: Support for adding notes to specific data points
- **Real-time Updates**: WebSocket integration for live data streaming
- **Custom Time Ranges**: User-defined date range selection 