import React from "react";
import { RefreshControl } from "react-native";

/**
 * RefreshControlWrapper component to standardize refresh behavior
 * Provides consistent pull-to-refresh UX across the app
 */
const RefreshControlWrapper = React.memo(({
  refreshing,
  onRefresh,
  colors = ["#4a90e2"],
  tintColor = "#4a90e2",
  ...props
}) => {
  // Ensure onRefresh is a stable function to prevent useInsertionEffect warnings
  const handleRefresh = React.useCallback(() => {
    if (onRefresh && typeof onRefresh === 'function') {
      try {
        const result = onRefresh();
        // Handle both sync and async functions
        if (result && typeof result.catch === 'function') {
          result.catch(error => console.error('Refresh error:', error));
        }
      } catch (error) {
        console.error('Refresh handler error:', error);
      }
    }
  }, [onRefresh]);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={colors}
      tintColor={tintColor}
      {...props}
    />
  );
});

export default RefreshControlWrapper;
