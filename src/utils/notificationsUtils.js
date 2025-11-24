/**
 * Utility functions for notifications processing
 */

import { Text, View } from "react-native";

/**
 * Render alert item using NotificationCard
 * @param {Object} item - Alert data item
 * @param {Function} getNotificationIcon - Function to get icon name
 * @param {Function} getAlertLevelConfig - Function to get alert level config
 * @param {Function} getParameterColor - Function to get parameter color
 * @param {Function} getEnhancedMessage - Function to get enhanced message
 * @param {Function} getAlertDetails - Function to get alert details
 * @param {Function} handleAlertPress - Function to handle alert press
 * @param {Function} handleDismissAlert - Function to handle dismiss
 * @returns {JSX.Element} NotificationCard component
 */
export const createAlertItem = (
  item,
  getNotificationIcon,
  getAlertLevelConfig,
  getParameterColor,
  getEnhancedMessage,
  getAlertDetails,
  handleAlertPress,
  handleDismissAlert
) => {
  const alertLevel = getAlertLevelConfig(item.type);
  const icon = getNotificationIcon(item.type);
  const enhancedMessage = getEnhancedMessage(item);
  const alertDetails = getAlertDetails();

  return {
    id: item.id,
    itemId: item.id,
    title: item.title,
    message: enhancedMessage,
    parameter: item.parameter,
    icon: icon,
    alertLevel: alertLevel,
    bg: alertLevel.bg,
    iconColor: alertLevel.iconColor,
    dotColor: getParameterColor(item.parameter),

    confidence: alertDetails.confidence,
    impact: alertDetails.impact,
    recommendations: alertDetails.recommendations,
    metadata: alertDetails.metadata,
    source: alertDetails.source,
    onPrimaryAction: handleAlertPress,
    onSecondaryAction: handleDismissAlert,
  };
};

/**
 * Render section header for SectionList
 * @param {Object} section - Section object with title
 * @returns {JSX.Element} Section header component
 */
export const renderSectionHeader = ({ section: { title } }) => (
  <View style={{ paddingHorizontal: 8, paddingBottom: 4, paddingTop: 10 }}>
    <Text style={{
      fontSize: 13,
      fontWeight: "400",
      color: "#1a2d51"
    }}>
      {title}
    </Text>
  </View>
);

// Re-export commonly used constants and functions
export { getAlertIcon, getSeverityColor, alertLevelMap } from "@constants/notifications";
