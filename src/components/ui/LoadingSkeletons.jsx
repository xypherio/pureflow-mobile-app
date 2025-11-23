import React from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width } = Dimensions.get('window');

// Shimmer animation for skeleton loading
const SkeletonShimmer = ({ children, duration = 2000 }) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [animatedValue, duration]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  return (
    <Animated.View style={{ opacity }}>
      {children}
    </Animated.View>
  );
};

// Skeleton styles
const skeletonStyles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
  },
  systemStatusSkeleton: {
    height: 50,
    marginBottom: 16,
    marginHorizontal: 0,
  },
  alertsSkeleton: {
    height: 80,
    marginBottom: 10,
    marginHorizontal: 0,
    backgroundColor: '#cbd5e1',
    opacity: 0.9,
  },
  parameterCardSkeleton: {
    height: 160,
    flexBasis: '48%',
    flexShrink: 0,
  },
  chartSkeleton: {
    height: 280,
    marginBottom: 20,
    marginTop: 20,
    backgroundColor: '#cbd5e1',
    opacity: 0.9,
  },
  insightsSkeleton: {
    height: 200,
    marginBottom: 20,
  },
  forecastInsightsSkeleton: {
    height: 180,
    borderRadius: 18,
    padding: 20,
    marginVertical: 5,
  },
  realtimeParamsContainer: {
    backgroundColor: '#2455a9',
    padding: 10,
    borderRadius: 18,
    marginBottom: 10,
  },
  parameterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    columnGap: 12,
  },
});

// Skeleton Components
export const SystemStatusSkeleton = () => (
  <SkeletonShimmer>
    <View style={[skeletonStyles.skeleton, skeletonStyles.systemStatusSkeleton]} />
  </SkeletonShimmer>
);

export const AlertsSkeleton = () => (
  <SkeletonShimmer>
    <View style={[skeletonStyles.skeleton, skeletonStyles.alertsSkeleton]} />
  </SkeletonShimmer>
);

export const RealtimeDataSkeleton = () => (
  <SkeletonShimmer>
    <View style={skeletonStyles.realtimeParamsContainer}>
      <View style={skeletonStyles.parameterGrid}>
        {/* 4 parameter cards */}
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={index}
            style={[skeletonStyles.skeleton, skeletonStyles.parameterCardSkeleton]}
          />
        ))}
      </View>
    </View>
  </SkeletonShimmer>
);

export const LineChartSkeleton = () => (
  <SkeletonShimmer>
    <View style={[skeletonStyles.skeleton, skeletonStyles.chartSkeleton]} />
  </SkeletonShimmer>
);

export const InsightsSkeleton = () => (
  <SkeletonShimmer>
    <View style={[skeletonStyles.skeleton, skeletonStyles.insightsSkeleton]} />
  </SkeletonShimmer>
);

// Combined Dashboard Skeleton
export const DashboardSkeleton = () => (
  <View>
    {/* Active Alerts */}
    <View style={{ marginBottom: 12 }}>
      <AlertsSkeleton />
    </View>

    {/* Real-Time Parameters */}
    <View style={{ marginBottom: 12 }}>
      <RealtimeDataSkeleton />
    </View>

    {/* Daily Trends */}
    <View>
      <LineChartSkeleton />
    </View>
  </View>
);

export const ForecastInsightsSkeleton = () => (
  <SkeletonShimmer>
    <View style={[skeletonStyles.skeleton, skeletonStyles.forecastInsightsSkeleton]} />
  </SkeletonShimmer>
);

// Complete home screen skeleton
export const HomeScreenSkeleton = () => (
  <View>
    {/* System Status */}
    <SystemStatusSkeleton />

    {/* Dashboard Section */}
    <DashboardSkeleton />

    {/* Insights Section */}
    <InsightsSkeleton />
  </View>
);
