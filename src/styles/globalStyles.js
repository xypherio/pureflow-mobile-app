import { StyleSheet } from "react-native";

// Color palette
export const colors = {
  // Primary colors
  primary: '#1c5c88',
  primaryLight: '#4a8ab8',
  primaryDark: '#00335b',
  
  // Background colors
  background: '#e5f0f9',
  backgroundLight: '#f8fafc',
  backgroundBlue: '#e6fbff',
  
  // Text colors
  text: '#1a2d51',
  textLight: '#4a5568',
  textMuted: '#718096',
  
  // UI colors
  white: '#FFFFFF',
  black: '#000000',
  shadow: '#2569d0',
  border: '#e2e8f0',
  
  // Status colors
  success: '#22c55e',
  successLight: '#e6f9ed',
  warning: '#eab308',
  warningLight: '#fef9c3',
  error: '#ef4444',
  errorLight: '#fee2e2',
  info: '#2563eb',
  infoLight: '#dbeafe',
  
  // Chart colors
  chart1: 'rgba(134, 65, 244, 1)',
  chart2: 'rgba(255, 99, 132, 1)',
  chart3: 'rgba(54, 162, 235, 1)',
  chart4: 'rgba(75, 192, 192, 1)',
};

// Common styles
export const globalStyles = StyleSheet.create({
  // Layout
  pageBackground: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },

  //logo
    logo: {
    width: 150,
    height: 65,
    resizeMode: "contain",
  },

  // Shadows
    boxShadow: {
    shadowColor: "#2569d0",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
    zIndex: 1000,
  },

  // Typography
  text: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  smallText: {
    fontSize: 12,
    color: colors.textLight,
  },

  // Cards & Containers
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Buttons
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Text styles
  text: {
    color: colors.text,
    fontFamily: 'Poppins_400Regular',
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
  },
  subheading: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
    fontFamily: 'Poppins_500Medium',
  },
});

export default globalStyles;