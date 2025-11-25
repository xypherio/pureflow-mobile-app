import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * Error boundary for alert components to prevent crashes when alert rendering fails
 */
class AlertErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Alert component error:', error, errorInfo);

    // Reset error state after a short delay to allow retry
    setTimeout(() => {
      this.setState({ hasError: false, error: null });
    }, 5000); // Reset after 5 seconds
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when alert rendering fails
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Unable to display alerts
          </Text>
          <Text style={styles.errorSubtext}>
            Please check your connection and try again
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginVertical: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#dc2626",
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 14,
    color: "#7f1d1d",
    textAlign: "center",
  },
});

export default AlertErrorBoundary;
