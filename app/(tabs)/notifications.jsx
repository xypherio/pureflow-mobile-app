import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  Filter,
  Calendar,
  Clock,
  RefreshCw,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { historicalAlertsService } from '@services/historicalAlertsService';
import NotificationCard from '@ui/notification-card';
import PureFlowLogo from '@ui/ui-header';
import NotificationFilter from '@navigation/alerts-filter';
import GlobalWrapper from '@ui/global-wrapper';

// Alert type mappings for display
const getAlertIcon = (type) => {
  switch (type) {
    case 'error':
      return <AlertTriangle size={20} color="#ef4444" />;
    case 'warning':
      return <AlertTriangle size={20} color="#eab308" />;
    case 'info':
      return <Info size={20} color="#2563eb" />;
    case 'success':
      return <CheckCircle size={20} color="#22c55e" />;
    default:
      return <Bell size={20} color="#6b7280" />;
  }
};

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'high':
      return '#ef4444';
    case 'medium':
      return '#eab308';
    case 'low':
      return '#22c55e';
    default:
      return '#6b7280';
  }
};

const alertLevelMap = {
  success: { icon: "check-circle", iconColor: "#22c55e", bg: "#e6f9ed" },
  warning: { icon: "alert-triangle", iconColor: "#eab308", bg: "#fef9c3" },
  error: { icon: "x-circle", iconColor: "#ef4444", bg: "#fee2e2" },
  info: { icon: "info", iconColor: "#2563eb", bg: "#dbeafe" },
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [activeParameter, setActiveParameter] = useState('all'); // Water parameter filter
  const [activeSeverity, setActiveSeverity] = useState('all'); // Severity/alert type filter
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(20); // Initial limit for displayed alerts
  const [loadingMore, setLoadingMore] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);

  // Fetch historical alerts from Firebase
  const fetchHistoricalAlerts = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('🔄 Fetching historical alerts...');
      const alertsData = await historicalAlertsService.getHistoricalAlerts({
        useCache: !showRefreshIndicator,
        limitCount: 200, // Fetch more alerts to support pagination
        filterType: activeSeverity !== 'all' ? activeSeverity : null, // Severity filter (error, warning, info, normal)
        filterParameter: activeParameter !== 'all' ? activeParameter : null, // Parameter filter (pH, temperature, etc.)
      });

      setHistoricalData(alertsData);
      console.log(`✅ Loaded ${alertsData.totalCount} historical alerts in ${alertsData.sections.length} sections`);
    } catch (err) {
      console.error('❌ Error fetching historical alerts:', err);
      setError(err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeParameter, activeSeverity]);

  // Load more alerts function
  const loadMoreAlerts = useCallback(async () => {
    if (loadingMore) return;
    
    setLoadingMore(true);
    try {
      // Increase display limit by 20
      setDisplayLimit(prev => prev + 20);
      console.log(`📈 Increased display limit to ${displayLimit + 20} alerts`);
    } catch (err) {
      console.error('❌ Error loading more alerts:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, displayLimit]);

  // Get limited sections for display
  const getLimitedSections = useCallback((sections) => {
    if (!sections || sections.length === 0) return [];
    
    let totalDisplayed = 0;
    const limitedSections = [];
    
    for (const section of sections) {
      if (totalDisplayed >= displayLimit) break;
      
      const remainingLimit = displayLimit - totalDisplayed;
      const limitedData = section.data.slice(0, remainingLimit);
      
      if (limitedData.length > 0) {
        limitedSections.push({
          ...section,
          data: limitedData,
        });
        totalDisplayed += limitedData.length;
      }
    }
    
    return limitedSections;
  }, [displayLimit]);

  // Check if there are more alerts to load
  const hasMoreAlerts = useCallback(() => {
    if (!historicalData?.sections) return false;
    
    const totalAlerts = historicalData.sections.reduce((sum, section) => sum + section.data.length, 0);
    return totalAlerts > displayLimit;
  }, [historicalData, displayLimit]);

  // Initial load
  useEffect(() => {
    fetchHistoricalAlerts();
  }, [fetchHistoricalAlerts]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    // Clear cache and fetch fresh data
    historicalAlertsService.clearCache();
    fetchHistoricalAlerts(true);
  }, [fetchHistoricalAlerts]);

  // Handle parameter filter changes (upper row)
  const handleParameterChange = useCallback((newParameter) => {
    console.log(`🔍 Parameter filter changed to: ${newParameter}`);
    setActiveParameter(newParameter);
    setDisplayLimit(20); // Reset display limit when filter changes
    setIsNearBottom(false);
    // Trigger fresh data fetch with new filter
    fetchHistoricalAlerts(false);
  }, [fetchHistoricalAlerts]);

  // Handle severity filter changes (lower row)
  const handleSeverityChange = useCallback((newSeverity) => {
    console.log(`🔍 Severity filter changed to: ${newSeverity}`);
    setActiveSeverity(newSeverity);
    setDisplayLimit(20); // Reset display limit when filter changes
    setIsNearBottom(false);
    // Trigger fresh data fetch with new filter
    fetchHistoricalAlerts(false);
  }, [fetchHistoricalAlerts]);

  // Handle scroll detection
  const handleScroll = useCallback((event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100; // Trigger when 100px from bottom
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    setIsNearBottom(isCloseToBottom);
  }, []);

  // Map alert type to NotificationCard icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error':
        return 'x-circle';
      case 'warning':
        return 'alert-triangle';
      case 'success':
        return 'check-circle';
      case 'info':
      default:
        return 'info';
    }
  };

  // Get alert level configuration for NotificationCard
  const getAlertLevelConfig = (type) => {
    const configs = {
      success: { bg: '#e6f9ed', iconColor: '#22c55e' },
      warning: { bg: '#fef9c3', iconColor: '#eab308' },
      error: { bg: '#fee2e2', iconColor: '#ef4444' },
      info: { bg: '#dbeafe', iconColor: '#2563eb' },
    };
    return configs[type] || configs.info;
  };

  // Render alert item using NotificationCard
  const renderAlertItem = ({ item }) => {
    const alertLevel = getAlertLevelConfig(item.type);
    const icon = getNotificationIcon(item.type);
    
    // Enhanced message with metadata
    const enhancedMessage = `${item.message}\n\n${item.parameter} • ${item.dataAge}${item.occurrenceCount > 1 ? ` • ${item.occurrenceCount} occurrences` : ''}`;

    return (
      <View className="mx-4">
        <NotificationCard
          type="suggestion"
          title={item.title}
          message={enhancedMessage}
          parameter={item.parameter}
          icon={icon}
          alertLevel={alertLevel}
          primaryLabel="View Details"
          secondaryLabel="Dismiss"
          onPrimaryAction={() => navigation.navigate('forecast')}
          onSecondaryAction={() => console.log('Dismissed alert:', item.id)}
        />
      </View>
    );
  };

  // Render section header
  const renderSectionHeader = ({ section: { title } }) => (
    <View className="px-4 py-2 bg-gray-50">
      <Text className="text-lg font-semibold text-gray-800">
        {title}
      </Text>
    </View>
  );

  // Loading state
  if (loading && !historicalData) {
    return (
      <GlobalWrapper className="flex-1 bg-[#e6fbff]">
        <View className="mb-4 items-start">
          <PureFlowLogo
            weather={{
              label: "Light Rain",
              temp: "30°C",
              icon: "partly",
            }}
          />
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#007AFF" />
          <Text className="mt-2 text-gray-600">Loading alerts...</Text>
        </View>
      </GlobalWrapper>
    );
  }

  // Error state
  if (error && !historicalData) {
    return (
      <GlobalWrapper className="flex-1 bg-[#e6fbff]">
        <View className="mb-4 items-start">
          <PureFlowLogo
            weather={{
              label: "Light Rain",
              temp: "30°C",
              icon: "partly",
            }}
          />
        </View>
        <View className="flex-1 justify-center items-center px-4">
          <AlertTriangle size={48} color="#ef4444" />
          <Text className="mt-4 text-lg font-semibold text-gray-900 text-center">
            Failed to Load Alerts
          </Text>
          <Text className="mt-2 text-gray-600 text-center">
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => fetchHistoricalAlerts()}
            className="mt-4 px-6 py-3 bg-blue-500 rounded-lg"
          >
            <Text className="text-white font-medium">Try Again</Text>
          </TouchableOpacity>
        </View>
      </GlobalWrapper>
    );
  }

  const allSections = historicalData?.sections || [];
  const limitedSections = getLimitedSections(allSections);
  const hasAlerts = limitedSections.length > 0;
  const showLoadMore = hasMoreAlerts();
  const totalAlerts = allSections.reduce((sum, section) => sum + section.data.length, 0);
  const displayedAlerts = limitedSections.reduce((sum, section) => sum + section.data.length, 0);

  // Render Load More button (only when near bottom)
  const renderLoadMoreButton = () => {
    if (!showLoadMore || !isNearBottom) return null;
    
    return (
      <View className="mx-4 mt-2 mb-6">
        <TouchableOpacity
          onPress={loadMoreAlerts}
          disabled={loadingMore}
          className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg flex-row items-center justify-center"
          style={{
            backgroundColor: '#007AFF',
            shadowColor: '#007AFF',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          {loadingMore ? (
            <>
              <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-semibold">Loading more alerts...</Text>
            </>
          ) : (
            <>
              <Text className="text-white font-semibold mr-2">Load More Alerts</Text>
              <Text className="text-blue-100 text-sm">({totalAlerts - displayedAlerts} remaining)</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <GlobalWrapper className="flex-1 bg-[#e6fbff]" disableScrollView>
      <View className="mb-4 items-start">
        <PureFlowLogo
          weather={{
            label: "Light Rain",
            temp: "30°C",
            icon: "partly",
          }}
        />
      </View>
      
      {/* Filters */}
      <View className="mx-4 mb-4">
        <NotificationFilter
          selectedAlert={activeParameter}
          selectedParam={activeSeverity}
          onSelectAlert={handleParameterChange}
          onSelectParam={handleSeverityChange}
        />
      </View>

      {/* Alerts List */}
      {hasAlerts ? (
        <>
          <SectionList
            sections={limitedSections}
            keyExtractor={(item) => item.id}
            renderItem={renderAlertItem}
            renderSectionHeader={renderSectionHeader}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#007AFF']}
                tintColor={"#007AFF"}
              />
            }
            contentContainerStyle={{ 
              paddingBottom: showLoadMore && isNearBottom ? 0 : 24,
              flexGrow: 1
            }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          />
          {renderLoadMoreButton()}
        </>
      ) : (
        <View className="flex-1 justify-center items-center px-4">
          <Bell size={48} color="#9ca3af" />
          <Text className="mt-4 text-lg font-semibold text-gray-900 text-center">
            No Alerts Found
          </Text>
          <Text className="mt-2 text-gray-600 text-center">
            {activeParameter !== 'all' || activeSeverity !== 'all'
              ? 'Try adjusting your filters to see more alerts.'
              : 'No historical alerts available at the moment.'}
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            className="mt-4 px-6 py-3 bg-blue-500 rounded-lg"
          >
            <Text className="text-white font-medium">Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </GlobalWrapper>
  );
}
