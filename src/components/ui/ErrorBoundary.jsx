import React from "react";
import { StyleSheet, Text, View } from "react-native";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // In a production app, you'd report this to your error monitoring service
    if (__DEV__ === false) {
      // Report to error monitoring service
      console.error('Production error in ErrorBoundary:', error.toString(), errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong.</Text>
          <Text style={styles.errorMessage}>
            {this.props.fallbackMessage || 'This section encountered an error and couldn\'t load. Please try refreshing the page.'}
          </Text>
          {__DEV__ && this.state.error && (
            <View style={styles.devErrorInfo}>
              <Text style={styles.devErrorText}>
                Error: {this.state.error.toString()}
              </Text>
            </View>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    padding: 20,
    margin: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#7f1d1d',
    textAlign: 'center',
    lineHeight: 20,
  },
  devErrorInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    width: '100%',
  },
  devErrorText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;
