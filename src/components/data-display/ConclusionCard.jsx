import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, globalStyles } from '../../styles/globalStyles';
import { sectionLabelStyle } from '../../../app/(tabs)/report.jsx';
import { CheckCircle, AlertCircle, AlertTriangle } from "lucide-react-native";

const safeString = (value) => {
  if (value === null || value === undefined) {
    return "No data available";
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

const statusIcons = {
  normal: { name: 'check-circle', color: '#059669', icon: CheckCircle },
  caution: { name: 'alert-circle', color: '#d97706', icon: AlertTriangle },
  critical: { name: 'alert-octagon', color: '#dc2626', icon: AlertCircle }
};

const ConclusionCard = ({
  overallStatus = 'normal',
  insightData,
  style,
}) => {
  const { overallInsight, parameterRecommendations } = insightData || {};
  const status = statusIcons[overallStatus] || statusIcons.normal;

  // Guard against missing or invalid insightData
  if (!insightData || typeof insightData !== 'object' || !parameterRecommendations) {
    return (
      <View style={[stylesheet.card, style]}>
        <Text style={[globalStyles.text, stylesheet.conclusion]}>Generating insight...</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={[stylesheet.card, style]}>
        <View style={stylesheet.header}>
          <View style={[stylesheet.iconContainer, { backgroundColor: `${status.color}15` }]}>
            <status.icon
              size={24}
              color={status.color}
            />
          </View>
          <Text style={[sectionLabelStyle, { color: status.color, fontWeight: 'bold' }]}>
            {overallStatus === 'normal' ? 'Good Water Quality' :
             overallStatus === 'caution' ? 'Needs Attention' : 'Critical Alert'}
          </Text>
        </View>

        <Text style={[globalStyles.text, stylesheet.conclusion]}>
          {safeString(overallInsight)}
        </Text>
        <Text style={[globalStyles.text, { fontSize: 10, color: colors.gray }]}>
          Last updated: {new Date().toLocaleString()}
        </Text>
      </View>

      {Array.isArray(parameterRecommendations) &&
        parameterRecommendations.map((rec, index) => {
          const paramStatus = statusIcons[rec.status] || statusIcons.normal;
          return (
            <View key={index} style={[stylesheet.card, style]}>
              <View style={stylesheet.header}>
                <View style={[stylesheet.iconContainer, { backgroundColor: `${paramStatus.color}15` }]}>
                  <paramStatus.icon
                    size={24}
                    color={paramStatus.color}
                  />
                </View>
                <Text style={[sectionLabelStyle, { color: paramStatus.color, fontWeight: 'bold' }]}>
                  {rec.parameter} Recommendation
                </Text>
              </View>
              <Text style={[globalStyles.text, stylesheet.conclusion]}>
                {safeString(rec.recommendation)}
              </Text>
              <Text style={[globalStyles.text, { fontSize: 10, color: colors.gray }]}>
                Last updated: {new Date().toLocaleString()}
              </Text>
            </View>
          );
        })}
    </View>
  );
};

const stylesheet = StyleSheet.create({
  card: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#5499C7',
  },
  insightText: {
    fontSize: 16,
    color: '#333',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  conclusion: {
    fontSize: 16,
    color: '#333',
  },
  recommendations: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bulletIcon: {
    marginRight: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 18,
  },
});

export default ConclusionCard;
