/** ForecastParameterDetailsSection - Detailed parameter forecast analysis with influencing factors and recommended actions */
import { Pointer } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Utils
import { getParameterTheme } from "@utils/forecastUtils";

// Helper function to generate trend-aware fallbacks
const getTrendAwareFallbacks = (selectedParam, trend) => {
  const normalizedParam = selectedParam.toLowerCase();
  const normalizedTrend = trend?.toLowerCase() || 'stable';

  const fallbacks = {
    ph: {
      rising: {
        factors: [
          "Baking soda/lime in feed making water less acid",
          "Fresh water from hose or well is less sour",
          "Plants in pond using up sour gas from their breathing"
        ],
        actions: [
          "Keep checking pH - it might get too high and bother fish",
          "Have baking soda ready if fish start floating funny",
          "Shade pond more if plants are bubbling too much"
        ]
      },
      falling: {
        factors: [
          "Baking soda in feed getting less - fish food changed?",
          "Heavy rain bringing sour water from nearby ground",
          "Fish waste piling up making water acidic"
        ],
        actions: [
          "Add little baking soda if pH keeps dropping slow",
          "Check new fish food - might need more baking soda in it",
          "Watch if ammonia or nitrite is also going up"
        ]
      },
      stable: {
        factors: [
          "Same baking soda amount in feed every day",
          "Plants in pond eating sour gas normally",
          "Fish waste breaking down same as always"
        ],
        actions: [
          "Test pH twice a week like usual",
          "Use same baking soda amount you're comfortable with",
          "Change same water amount each week"
        ]
      }
    },
    temperature: {
      rising: {
        factors: [
          "Days getting hotter and warmer winds blowing",
          "Shallow pond water heating up fast in sun",
          "Hot sun all afternoon making water warm sitting still"
        ],
        actions: [
          "Put up shade cloth or tarp if no shade trees",
          "Make pond deeper if possible for cooler water",
          "Check temperature during hottest part of day"
        ]
      },
      falling: {
        factors: [
          "Evenings getting cooler and cold weather coming",
          "Cloudy days blocking sun from warming water",
          "Deep pond bottom getting exposed to cooler air"
        ],
        actions: [
          "Cover pond at night if it gets very cold",
          "Watch fish for slow movement signs from cold",
          "Feed less when water is cold - fish eat slower"
        ]
      },
      stable: {
        factors: [
          "Weather staying same hot/cold every day",
          "Shade working good and pond in good spot",
          "Water moving around keeping heat even"
        ],
        actions: [
          "Keep shade up and check temperature daily",
          "Move water around pond to keep heat even",
          "Plan feeding when water is normally warmest"
        ]
      }
    },
    salinity: {
      rising: {
        factors: [
          "Sun making water dry up and salt getting stronger",
          "Putting more salt in feed for fish health",
          "Less fresh water going in pond"
        ],
        actions: [
          "Check salt level before adding more to feed",
          "Add fresh water if salt gets too strong",
          "Watch if fish are swimming funny from too much salt"
        ]
      },
      falling: {
        factors: [
          "Heavy rain washing salt out right away",
          "Adding lots fresh water all at once",
          "Less salt in feed mix than usual"
        ],
        actions: [
          "Add salt slow over a few days, don't put in all at once",
          "Test salt after rain and add what was washed out",
          "Watch fish for signs they're adjusting to less salt"
        ]
      },
      stable: {
        factors: [
          "About same water drying up and fresh water added",
          "Same salt amount in feed every day",
          "Weather staying dry or rainy same as last weeks"
        ],
        actions: [
          "Test salt regular and add same amount",
          "Add fresh water when it's usually dry time",
          "Change salt amount if fish getting bigger or smaller"
        ]
      }
    },
    turbidity: {
      rising: {
        factors: [
          "Fish more active and stirring up bottom mud",
          "Too much feed making more mess floating around",
          "New fresh water bringing clear water that stirs up mud"
        ],
        actions: [
          "Feed less for few days to let mud settle",
          "Add more filter or another small settling pond",
          "Check how muddy water is every day"
        ]
      },
      falling: {
        factors: [
          "Heavy rain washing away floating dirt",
          "Fish less active letting mud settle naturally",
          "Filter working better catching dirt particles"
        ],
        actions: [
          "Use cleaner water time to clean pond bottom",
          "Clean filter regular to keep it working",
          "Watch for over-clean water making fish see too far"
        ]
      },
      stable: {
        factors: [
          "Same number fish making same mess amount",
          "Feeding same amount every day",
          "Filter balancing dirt coming in with catching it"
        ],
        actions: [
          "Clean filter on regular schedule",
          "Feed same amounts you're comfortable with",
          "Scoop bottom mud regular before it piles too high"
        ]
      }
    }
  };

  return fallbacks[normalizedParam]?.[normalizedTrend] || {
    factors: [
      "Parameter stability factors being analyzed",
      "Environmental conditions under monitoring",
      "System equilibrium patterns observed"
    ],
    actions: [
      "Continue regular parameter monitoring and testing",
      "Maintain consistent system management practices",
      "Adjust interventions based on parameter trend observations"
    ]
  };
};

const ParameterDetails = ({ selectedParam, setSelectedParam, geminiResponse, trends }) => {
  if (!selectedParam) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Parameter Details</Text>
        </View>

        <View style={[styles.container, styles.promptContainer]}>
          <View style={styles.gradientOverlay} />

          <View style={styles.promptContent}>
            <View style={styles.promptIconContainer}>
              <Pointer size={35} color="#3B82F6" style={styles.promptIcon} />
            </View>
            <Text style={styles.promptTitle}>Select a Parameter</Text>
            <Text style={styles.promptText}>
              Tap any parameter card above to view detailed forecast information, insights, and recommendations.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const theme = getParameterTheme(selectedParam);

  const getFactorsData = () => {
    try {
      const suggestion = geminiResponse?.suggestions?.find(s => s.parameter.toLowerCase() === selectedParam.toLowerCase());
      const factors = suggestion?.influencingFactors;

      // Ensure factors is always an array of strings
      if (Array.isArray(factors)) {
        return factors;
      } else if (typeof factors === 'string') {
        // Handle case where it's a single string instead of array
        return [factors];
      } else if (factors && typeof factors === 'object') {
        // Handle case where factors might be an object
        console.warn('Influencing factors returned as object instead of array:', factors);
        return ["Forecast factors are being analyzed"];
      }
    } catch (error) {
      console.error('Error getting influencing factors:', error);
    }

    // Trend-aware parameter-specific fallback
    const trend = trends?.[selectedParam] || 'stable';
    const fallback = getTrendAwareFallbacks(selectedParam, trend);
    return fallback.factors;
  };

  const getActionsData = () => {
    try {
      const suggestion = geminiResponse?.suggestions?.find(s => s.parameter.toLowerCase() === selectedParam.toLowerCase());
      const actions = suggestion?.recommendedActions;

      // Ensure actions is always an array of strings
      if (Array.isArray(actions)) {
        return actions;
      } else if (typeof actions === 'string') {
        // Handle case where it's a single string instead of array
        return [actions];
      } else if (actions && typeof actions === 'object') {
        // Handle case where actions might be an object
        console.warn('Recommended actions returned as object instead of array:', actions);
        return ["Precautionary action is being prepared"];
      }
    } catch (error) {
      console.error('Error getting recommended actions:', error);
    }

    // Trend-aware parameter-specific fallback
    const trend = trends?.[selectedParam] || 'stable';
    const fallback = getTrendAwareFallbacks(selectedParam, trend);
    return fallback.actions;
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Parameter Details</Text>
      </View>

      <View style={[styles.container, { borderColor: theme.color }]}>
        <View style={[styles.gradientOverlay, { backgroundColor: theme.color }]} />

        <View style={[styles.contentContainer, styles.noIconContent]}>
          <Text style={[styles.title, { color: theme.color }]}>
            {selectedParam} Forecast Analysis
          </Text>

          <Text style={styles.description}>
            Detailed insights for {selectedParam.toLowerCase()} parameter including influencing factors and recommended actions.
          </Text>

          {/* Influencing Factors */}
          <View style={[styles.recommendationsCard, { borderLeftColor: theme.color }]}>
            <View style={styles.recommendationsContainer}>
              <Text style={[styles.recommendationsTitle, { color: theme.color }]}>
                🌧️ Influencing Factors:
              </Text>
              {(getFactorsData()).map ? getFactorsData().map((factor, index) => (
                <Text key={index} style={styles.recommendationItem}>
                  • {typeof factor === 'string' ? factor : 'Loading forecast factor...'}
                </Text>
              )) : (
                <Text style={styles.recommendationItem}>
                  • Error loading forecast factors
                </Text>
              )}
            </View>
          </View>

          {/* Recommended Actions */}
          <View style={[styles.recommendationsCard, { borderLeftColor: theme.color }]}>
            <View style={styles.recommendationsContainer}>
              <Text style={[styles.recommendationsTitle, { color: theme.color }]}>
                💡 Recommended Actions:
              </Text>
              {(getActionsData()).map ? getActionsData().map((action, index) => (
                <Text key={index} style={styles.recommendationItem}>
                  • {typeof action === 'string' ? action : 'Loading recommended action...'}
                </Text>
              )) : (
                <Text style={styles.recommendationItem}>
                  • Error loading recommended actions
                </Text>
              )}
            </View>
          </View>

          {/* Status indicator */}
          <View style={styles.statusIndicator}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Parameter Analysis</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Section styles (matching InsightsCard)
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    color: "#1a2d51"
  },

  // Card container styles
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginVertical: 5,
    borderWidth: 1,
    borderTopWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  promptContainer: {
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    height: 250,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.3,
  },

  // Content layout styles
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
  },
  noIconContent: {
    flexDirection: 'column',
  },
  promptContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  // Typography styles
  title: {
    marginBottom: 12,
    fontWeight: '700',
    letterSpacing: -0.025,
    lineHeight: 24,
    fontSize: 18,
  },
  description: {
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '500',
    fontSize: 14,
    letterSpacing: 0.025,
  },

  // Prompt styles (for no selection state)
  promptIconContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptIcon: {
    fontSize: 30,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 8,
  },
  promptText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Recommendations styles
  recommendationsCard: {
    width: 320,
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9ca3af',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recommendationsContainer: {
    paddingLeft: 4,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: 0.025,
  },
  recommendationItem: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginLeft: 12,
    marginBottom: 4,
    paddingLeft: 4,
  },

  // Status indicator
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default ParameterDetails;
