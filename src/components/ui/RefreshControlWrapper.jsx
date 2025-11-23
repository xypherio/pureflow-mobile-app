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
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={colors}
      tintColor={tintColor}
      {...props}
    />
  );
});

export default RefreshControlWrapper;
