import React from 'react';
import { Text } from 'react-native';

const DEFAULT_HIGHLIGHT_COLOR = '#FEE2E2'; // Light red for critical-like emphasis
const WARNING_HIGHLIGHT_COLOR = '#FEF3C7'; // Light yellow for warning-like emphasis
const INFO_HIGHLIGHT_COLOR = '#DBEAFE';   // Light blue for info-like emphasis
const POSITIVE_HIGHLIGHT_COLOR = '#D1FAE5'; // Light green for positive-like emphasis

/**
 * Formats a given text with highlights and bolding based on keywords and context.
 * It returns an array of Text components suitable for React Native rendering.
 *
 * @param {string} text The input text to format.
 * @param {string} type The type of insight (e.g., 'info', 'warning', 'critical', 'positive') for contextual styling.
 * @returns {Array<React.Element>} An array of Text components.
 */
export const formatInsightText = (text, type = 'info') => {
  if (!text) return [<Text key="empty-text">No data available</Text>];

  const formattedElements = [];
  const lines = text.split('\n');

  // Define keywords and their styles
  const keywords = [
    { regex: /\b(pH|temperature|salinity|turbidity|water quality|system status)\b/gi, style: { fontWeight: 'bold', color: '#1A2D51' } },
    { regex: /\b(critical|warning|danger|unsafe|high|low|exceeds|below)\b/gi, style: { fontWeight: 'bold', color: '#EF4444' } },
    { regex: /\b(normal|safe|optimal|stable|good|excellent|within range)\b/gi, style: { fontWeight: 'bold', color: '#059669' } },
    { regex: /\b(recommendation|suggestion|action|monitor|adjust|check|ensure|implement)\b/gi, style: { fontStyle: 'italic', color: '#3B82F6' } },
    { regex: /\d+(\.\d+)?(%|°C|NTU|ppt)?/g, style: { fontWeight: 'bold', color: '#6B7280' } } // Numbers with units
  ];

  const getHighlightColor = (insightType) => {
    switch (insightType) {
      case 'critical': return DEFAULT_HIGHLIGHT_COLOR;
      case 'warning': return WARNING_HIGHLIGHT_COLOR;
      case 'positive': return POSITIVE_HIGHLIGHT_COLOR;
      case 'info':
      default: return INFO_HIGHLIGHT_COLOR;
    }
  };

  const highlightColor = getHighlightColor(type);

  lines.forEach((line, lineIndex) => {
    if (line.trim().length === 0) {
      formattedElements.push(<Text key={`line-break-${lineIndex}`}>{"\n"}</Text>);
      return;
    }

    const segments = [];
    let lastIndex = 0;
    let tempLine = line;

    // Handle bullet points
    const bulletMatch = line.match(/^\s*(\*|-|\d+\.)\s*(.*)/);
    if (bulletMatch) {
      const bulletChar = bulletMatch[1];
      const restOfLine = bulletMatch[2];
      segments.push(
        <Text key={`bullet-${lineIndex}-char`} style={{ fontWeight: 'bold', color: '#6B7280', marginRight: 5 }}>
          {bulletChar + ' '}
        </Text>
      );
      tempLine = restOfLine;
    }

    const processText = (textSegment, segmentKey) => {
      let currentText = textSegment;
      let startIndex = 0;

      keywords.forEach(({ regex, style }) => {
        let match;
        while ((match = regex.exec(currentText)) !== null) {
          if (match.index > startIndex) {
            segments.push(
              <Text key={`${segmentKey}-${match.index}-plain`}>
                {currentText.substring(startIndex, match.index)}
              </Text>
            );
          }
          segments.push(
            <Text key={`${segmentKey}-${match.index}-highlight`} style={style}>
              {match[0]}
            </Text>
          );
          startIndex = match.index + match[0].length;
        }
      });

      if (startIndex < currentText.length) {
        segments.push(
          <Text key={`${segmentKey}-final-plain`}>
            {currentText.substring(startIndex)}
          </Text>
        );
      }
    };

    processText(tempLine, `line-${lineIndex}`);

    formattedElements.push(
      <Text key={`formatted-line-${lineIndex}`} style={{
        // Apply a subtle background highlight based on type
        backgroundColor: line.toLowerCase().includes(type) && type !== 'info' ? highlightColor : 'transparent',
        borderRadius: 4,
        paddingHorizontal: line.toLowerCase().includes(type) && type !== 'info' ? 4 : 0,
        marginVertical: 2,
        flexDirection: 'row', // Important for inline Text components
        flexWrap: 'wrap',
      }}>
        {segments}
      </Text>
    );

    // Add a newline between lines, but not after the last one if it's not a bullet point.
    // This helps preserve paragraph breaks from the original text.
    if (lineIndex < lines.length - 1 && !bulletMatch) {
      formattedElements.push(<Text key={`newline-${lineIndex}`}>{"\n"}</Text>);
    }
  });

  return formattedElements;
};
