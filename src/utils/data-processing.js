import { CHART_PARAMETERS } from './chart-config';

/**
 * Processes raw data from the hook into a format suitable for the LineChart component.
 * @param {Array} chartData - The raw data array from useChartData.
 * @param {string|null} selectedParameter - The currently selected parameter to display.
 * @returns {Object} - An object containing datasets and labels for the chart.
 */
export const processChartData = (chartData, selectedParameter) => {
  if (!chartData || chartData.length === 0) {
    return { datasets: [], labels: [] };
  }

  // Ensure data is sorted chronologically
  const sortedData = [...chartData].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

  const labels = sortedData.map(item => {
    // Defensive check: ensure datetime is a Date object before calling methods on it.
    const date = typeof item.datetime === 'string' ? new Date(item.datetime) : item.datetime;
    return date instanceof Date ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  });

  const parametersToDisplay = selectedParameter ? [selectedParameter] : CHART_PARAMETERS;

  const datasets = parametersToDisplay.map(param => ({
    data: sortedData.map(item => item[param] || 0),
    parameter: param, // Pass parameter for color mapping
  }));

  return { datasets, labels };
};

/**
 * Generates tooltip information for a specific data point.
 * @param {Object} pointData - The data for the selected point.
 * @param {string|null} selectedParameter - The currently selected parameter.
 * @returns {Object} - An object containing title, time, and a list of data points for the tooltip.
 */
export const getTooltipInfo = (pointData, selectedParameter) => {
  if (!pointData) return null;

  const date = typeof pointData.datetime === 'string' ? new Date(pointData.datetime) : pointData.datetime;
  const time = date instanceof Date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) : 'N/A';

  const parameters = selectedParameter ? [selectedParameter] : CHART_PARAMETERS;
  const dataPoints = parameters.map(param => ({
    label: param,
    value: pointData[param] !== undefined ? pointData[param] : 'N/A',
  }));

  return {
    title: 'Data Point Details',
    time,
    dataPoints,
  };
};
