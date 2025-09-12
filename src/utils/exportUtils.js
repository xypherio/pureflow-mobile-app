import { Platform } from 'react-native';

let generateReport;
let shareFiles;
let generateCsv;

if (Platform.OS === 'web') {
  // Import web-specific implementations
  const webExports = require('./exportUtils.web');
  generateReport = webExports.generateReport;
  shareFiles = webExports.shareFiles;
  generateCsv = async (chartData, processedParameters, insights) => {
    // Re-use the web generateReport's CSV logic by calling it with the correct type
    return webExports.generateReport(processedParameters.map(p => ({
      param: p.parameter,
      value: p.value,
      status: p.status,
      unit: p.unit,
    })), insights, null, 'csv');
  };
} else {
  // Native-specific implementations
  const RNFS = require('react-native-fs');
  const Share = require('react-native').Share;

  generateReport = async () => {
    console.warn('PDF generation is not supported on native platforms yet. Please use the web version for PDF export.');
    throw new Error('PDF generation is not available on native platforms.');
  };

  shareFiles = async (filePaths, title = 'Share Report') => {
    try {
      await Share.share({
        title: title,
        url: filePaths[0], // Assuming filePaths contains local file URLs
      });
    } catch (error) {
      console.error('Error sharing files on native:', error);
      throw new Error(`Failed to share files: ${error.message}`);
    }
  };

  generateCsv = async (chartData, processedParameters, insights) => {
    const csvFileName = `PureFlow_Report_${new Date().toISOString().split('T')[0]}.csv`;
    const path = `${RNFS.DocumentDirectoryPath}/${csvFileName}`;

    // CSV Header for raw data
    const allKeys = new Set();
    chartData.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));
    const rawDataHeaders = Array.from(allKeys).join(',');

    // CSV Rows for raw data
    const rawDataRows = chartData.map(item =>
      Array.from(allKeys).map(key => {
        let value = item[key];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`; // Enclose strings with commas in quotes
        }
        return value;
      }).join(',')
    ).join('\n');

    let csvContent = `PureFlow Water Quality Report\n`;
    csvContent += `Generated On: ${new Date().toLocaleString()}\n\n`;

    // Overall Insights
    if (insights) {
      csvContent += `"AI-Generated Insights",\n`;
      csvContent += `"${insights.replace(/"/g, '""')}"\n\n`; // Escape double quotes
    }

    // Parameter Overview
    if (processedParameters && processedParameters.length > 0) {
      csvContent += `Parameter Overview\n`;
      csvContent += `Parameter,Value,Unit,Status,Analysis,Min,Max\n`;
      processedParameters.forEach(p => {
        csvContent += `${p.parameter},${p.value},${p.unit || ''},${p.status},"${p.analysis.replace(/"/g, '""') || ''}",${p.minValue || ''},${p.maxValue || ''}\n`;
      });
      csvContent += `\n`;
    }

    // Raw Sensor Data
    if (rawDataHeaders && rawDataRows) {
      csvContent += `Raw Sensor Data\n`;
      csvContent += `${rawDataHeaders}\n${rawDataRows}\n`;
    }

    try {
      await RNFS.writeFile(path, csvContent, 'utf8');
      console.log('CSV file written to:', path);

      return { filePath: `file://${path}` };
    } catch (error) {
      console.error('Error writing CSV file:', error);
      throw new Error(`Failed to generate CSV: ${error.message}`);
    }
  };
}

// The createHtmlContent function is removed as it was only used by native PDF generation.

export { generateCsv, generateReport, shareFiles };

