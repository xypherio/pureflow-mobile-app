/**
 * @file exportUtils.js
 * @description Utility functions for exporting and sharing reports in various formats.
 * Provides functionality for generating CSV reports, sharing files, and managing temporary files.
 * 
 * Key Features:
 * - CSV report generation with comprehensive water quality data
 * - Cross-platform file sharing capabilities
 * - Memory-efficient file handling and cleanup
 * - Data validation and error handling
 * - Support for AI-generated insights and recommendations
 */

// Core Dependencies
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

/**
 * ==============================================
 * FILE SHARING UTILITIES
 * ==============================================
 */

/**
 * Shares files on native platforms with comprehensive error handling and fallback mechanisms.
 * 
 * @async
 * @function shareFiles
 * @param {Array<string>} filePaths - Array of absolute file paths to share
 * @param {string} [title='Share Report'] - Title displayed in the share dialog
 * @param {string} [mimeType='text/csv'] - MIME type of the file being shared
 * @throws {Error} When no files are provided or file doesn't exist
 * @returns {Promise<void>}
 * 
 * @example
 * await shareFiles(['/path/to/report.csv'], 'Water Quality Report', 'text/csv');
 */
const shareFiles = async (filePaths, title = 'Share Report', mimeType = 'text/csv') => {
  try {
    if (!filePaths || filePaths.length === 0) {
      throw new Error('No files to share');
    }

    const filePath = filePaths[0];
    
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    // Use expo-sharing for better cross-platform support
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType,
        dialogTitle: title,
        UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text'
      });
    } else {
      // Fallback to React Native Share
      await Share.share({
        title: title,
        url: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
        message: Platform.OS === 'android' ? title : undefined,
      });
    }
  } catch (error) {
    console.error('Error sharing files:', error);
    throw new Error(`Failed to share files: ${error.message}`);
  }
};

/**
 * ==============================================
 * REPORT GENERATION UTILITIES
 * ==============================================
 */

/**
 * Generates a well-formatted CSV file from the provided export data.
 * The CSV includes metadata, parameter summaries, AI insights, and raw data.
 * 
 * @async
 * @function generateCsv
 * @param {Object} exportData - The prepared export data containing report information
 * @param {Object} exportData.metadata - Report metadata (title, timestamp, etc.)
 * @param {Object} exportData.parameters - Water quality parameters and their values
 * @param {Object} exportData.insights - AI-generated insights and recommendations
 * @param {Array} exportData.rawData - Raw sensor data points
 * @returns {Promise<{filePath: string, fileName: string, size: number}>} - File information
 * @throws {Error} If CSV generation fails
 * 
 * @example
 * const csvInfo = await generateCsv({
 *   metadata: { title: 'Water Quality Report' },
 *   parameters: { /* ... *\/ },
 *   insights: { /* ... *\/ },
 *   rawData: [/* ... *\/]
 * });
 */
const generateCsv = async (exportData) => {
  try {
    const { metadata, parameters, insights, rawData } = exportData;
    const timestamp = new Date().toISOString().split('T')[0];
    const csvFileName = `PureFlow_Report_${timestamp}.csv`;
    const filePath = `${FileSystem.documentDirectory}${csvFileName}`;

    let csvContent = '';

    // Helper function to escape CSV values
    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Helper function to format numeric values
    const formatNumeric = (value) => {
      if (value === null || value === undefined) return 'N/A';
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value.toFixed(2);
      }
      if (typeof value === 'string' && value === 'N/A') return 'N/A';
      return String(value);
    };

    // ============================================
    // SECTION 1: REPORT HEADER
    // ============================================
    csvContent += `${metadata.title}\n`;
    csvContent += `Generated On,${new Date(metadata.generatedAt).toLocaleString()}\n`;
    csvContent += `Time Period,${metadata.timePeriod}\n`;
    csvContent += `Overall Status,${metadata.overallStatus}\n`;
    csvContent += `Water Quality Index,${metadata.wqi.value} (${metadata.wqi.status})\n`;
    csvContent += `\n`;

    // ============================================
    // SECTION 2: OVERALL WATER QUALITY REPORT
    // ============================================
    csvContent += `OVERALL WATER QUALITY REPORT\n`;
    csvContent += `Parameter,Average,Status,Details\n`;
    
    // Get parameter order matching PDF (pH, Temperature, Turbidity, Salinity)
    const parameterOrder = ['ph', 'temperature', 'turbidity', 'salinity'];
    parameterOrder.forEach(paramKey => {
      const param = parameters[paramKey];
      if (param) {
        const avgDisplay = formatNumeric(param.average);
        const status = param.status || 'unknown';
        const details = param.details || (param.trend?.message || 'No details available');
        csvContent += `${escapeCsv(param.displayName)},${escapeCsv(avgDisplay + param.unit)},${escapeCsv(status)},${escapeCsv(details)}\n`;
      }
    });
    
    csvContent += `\n`;

    // ============================================
    // SECTION 3: DETAILED REPORT FOR EACH PARAMETER
    // ============================================
    csvContent += `DETAILED REPORT FOR EACH PARAMETER\n`;
    csvContent += `\n`;

    parameterOrder.forEach(paramKey => {
      const param = parameters[paramKey];
      if (!param) return;

      // Parameter header
      csvContent += `${param.displayName}\n`;
      csvContent += `Label,Value,Unit,Details / AI Insights\n`;

      // Get AI insights for this parameter
      const recommendations = insights.recommendations || [];
      const paramInsight = recommendations.find(rec => 
        rec.parameter && rec.parameter.toLowerCase() === param.displayName.toLowerCase()
      );
      const aiInsightText = paramInsight 
        ? (paramInsight.recommendation || paramInsight.details || 'No AI insights') 
        : 'No AI insights available';

      // Parameter details rows
      const detailsValue = param.details || (param.trend?.message || 'No details available');
      
      // Get current value - use param.value if available, otherwise use average
      const currentValue = param.value && param.value !== 'N/A' 
        ? (typeof param.value === 'string' ? param.value : formatNumeric(param.value))
        : formatNumeric(param.average);
      
      csvContent += `Average,${escapeCsv(formatNumeric(param.average))},${escapeCsv(param.unit)},${escapeCsv('')}\n`;
      csvContent += `Current,${escapeCsv(currentValue)},${escapeCsv(param.unit)},${escapeCsv('')}\n`;
      csvContent += `Min,${escapeCsv(formatNumeric(param.min))},${escapeCsv(param.unit)},${escapeCsv('')}\n`;
      csvContent += `Max,${escapeCsv(formatNumeric(param.max))},${escapeCsv(param.unit)},${escapeCsv('')}\n`;
      csvContent += `Status,${escapeCsv(param.status || 'unknown')},,${escapeCsv('')}\n`;
      csvContent += `Details,,,${escapeCsv(detailsValue)}\n`;
      csvContent += `AI Insights,,,${escapeCsv(aiInsightText)}\n`;
      
      csvContent += `\n`;
    });

    // ============================================
    // SECTION 4: OVERALL INSIGHTS & RECOMMENDATIONS
    // ============================================
    csvContent += `OVERALL INSIGHTS & RECOMMENDATIONS\n`;
    csvContent += `\n`;
    
    // Overall Insights
    csvContent += `Overall Insights\n`;
    csvContent += `${escapeCsv(insights.overall || 'No AI insights available')}\n`;
    csvContent += `\n`;

    // Recommendations
    if (insights.recommendations && insights.recommendations.length > 0) {
      csvContent += `Recommendations\n`;
      insights.recommendations.forEach((rec, index) => {
        const recText = rec.recommendation || rec.details || 'No recommendation';
        csvContent += `${index + 1}. ${escapeCsv(recText)}\n`;
      });
      csvContent += `\n`;
    } else {
      csvContent += `Recommendations\n`;
      csvContent += `No recommendations available\n`;
      csvContent += `\n`;
    }

    // ============================================
    // SECTION 5: RAW SENSOR DATA (Optional)
    // ============================================
    if (rawData && rawData.length > 0) {
      csvContent += `RAW SENSOR DATA\n`;
      csvContent += `\n`;
      
      // Get all unique headers from all data points
      const allHeaders = new Set();
      rawData.forEach(item => {
        if (item && typeof item === 'object') {
          Object.keys(item).forEach(key => allHeaders.add(key));
        }
      });
      
      const headers = Array.from(allHeaders);
      if (headers.length > 0) {
        csvContent += headers.map(h => escapeCsv(h)).join(',') + '\n';
        
        rawData.forEach(item => {
          if (item && typeof item === 'object') {
            const row = headers.map(header => {
              let value = item[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'object') {
                return escapeCsv(JSON.stringify(value));
              }
              return escapeCsv(value);
            });
            csvContent += row.join(',') + '\n';
          }
        });
      }
    }

    // Write file
    await FileSystem.writeAsStringAsync(filePath, csvContent, { 
      encoding: FileSystem.EncodingType.UTF8 
    });

    console.log('CSV file generated successfully at:', filePath);
    return { 
      filePath, 
      fileName: csvFileName,
      size: csvContent.length 
    };

  } catch (error) {
    console.error('Error generating CSV file:', error);
    throw new Error(`Failed to generate CSV: ${error.message}`);
  }
};

/**
 * ==============================================
 * FILE VALIDATION UTILITIES
 * ==============================================
 */

/**
 * Validates if a file exists and has content before sharing.
 * 
 * @async
 * @function validateFile
 * @param {string} filePath - Absolute path to the file to validate
 * @returns {Promise<boolean>} - True if file exists and has content, false otherwise
 * 
 * @example
 * const isValid = await validateFile('/path/to/file.csv');
 */
const validateFile = async (filePath) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists && fileInfo.size > 0;
  } catch (error) {
    console.error('Error validating file:', error);
    return false;
  }
};

/**
 * ==============================================
 * DATA PREPARATION UTILITIES
 * ==============================================
 */

/**
 * Transforms raw report data into a standardized format for export.
 * Merges report data, processed parameters, and AI insights into a single object.
 * 
 * @function prepareExportData
 * @param {Object} reportData - The main report data object containing metadata and WQI
 * @param {Array} processedParameters - Processed water quality parameter data
 * @param {Object} geminiResponse - AI-generated insights and recommendations
 * @returns {Object} - Unified export data structure
 * 
 * @example
 * const exportData = prepareExportData(reportData, processedParameters, geminiResponse);
 */
const prepareExportData = (reportData, processedParameters, geminiResponse) => {
  // Base report metadata
  const exportData = {
    metadata: {
      title: "PureFlow Water Quality Report",
      generatedAt: new Date().toISOString(),
      timePeriod: reportData.timePeriod || "N/A",
      overallStatus: reportData.overallStatus || "normal",
      wqi: reportData.wqi || { value: 0, status: "unknown" }
    },
    
    // Parameters data
    parameters: {
      ph: formatParameterData(reportData.parameters?.pH, "pH", "", "6.5 - 8.5"),
      temperature: formatParameterData(reportData.parameters?.temperature, "Temperature", "°C", "26 - 30°C"),
      turbidity: formatParameterData(reportData.parameters?.turbidity, "Turbidity", "NTU", "0 - 50 NTU"),
      salinity: formatParameterData(reportData.parameters?.salinity, "Salinity", "ppt", "0 - 5 ppt"),
      tds: formatParameterData(reportData.parameters?.tds, "TDS", "mg/L", "0 - 1000 mg/L")
    },
    
    // AI insights and recommendations
    insights: {
      overall: geminiResponse?.insights?.overallInsight || "No AI insights available",
      forecast: geminiResponse?.forecast?.overallForecast || "No forecast available",
      recommendations: geminiResponse?.suggestions || []
    },
    
    // Raw data for CSV export
    rawData: processedParameters || []
  };
  
  return exportData;
};

/**
 * ==============================================
 * FILE MANAGEMENT UTILITIES
 * ==============================================
 */

/**
 * Asynchronously deletes temporary files to free up storage space.
 * Silently handles errors to prevent disruption of main application flow.
 * 
 * @async
 * @function cleanupFiles
 * @param {Array<string>} filePaths - Array of absolute file paths to delete
 * @returns {Promise<void>}
 * 
 * @example
 * await cleanupFiles(['/path/to/temp1.csv', '/path/to/temp2.pdf']);
 */
const cleanupFiles = async (filePaths) => {
  try {
    for (const filePath of filePaths) {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
        console.log('Cleaned up file:', filePath);
      }
    }
  } catch (error) {
    console.error('Error cleaning up files:', error);
  }
};

/**
 * Formats water quality parameter data for consistent display in exports.
 * 
 * @private
 * @function formatParameterData
 * @param {Object|null} paramData - Raw parameter data
 * @param {string} displayName - Human-readable parameter name
 * @param {string} unit - Measurement unit (e.g., '°C', 'NTU')
 * @param {string} safeRange - Recommended safe range for the parameter
 * @returns {Object} - Formatted parameter data object
 */
const formatParameterData = (paramData, displayName, unit, safeRange) => {
  if (!paramData) {
    return {
      displayName,
      value: "N/A",
      unit,
      safeRange,
      status: "unknown",
      details: "No data available",
      average: null,
      min: null,
      max: null,
      trend: { message: "No trend data" }
    };
  }
  
  // Handle average value - preserve null if data is missing, otherwise format
  const averageValue = typeof paramData.average === 'number' && Number.isFinite(paramData.average) 
    ? paramData.average 
    : null;
  const minValue = typeof paramData.min === 'number' && Number.isFinite(paramData.min) 
    ? paramData.min 
    : null;
  const maxValue = typeof paramData.max === 'number' && Number.isFinite(paramData.max) 
    ? paramData.max 
    : null;
  
  return {
    displayName,
    value: averageValue !== null ? averageValue.toFixed(2) : "N/A",
    unit,
    safeRange,
    status: paramData.status || "normal",
    details: paramData.trend?.message || "No details available",
    average: averageValue !== null ? averageValue : 0, // Use 0 for PDF compatibility
    min: minValue !== null ? minValue : 0, // Use 0 for PDF compatibility
    max: maxValue !== null ? maxValue : 0, // Use 0 for PDF compatibility
    trend: paramData.trend || { message: "No trend data" }
  };
};

/**
 * Converts file size in bytes to a human-readable string.
 * 
 * @function formatFileSize
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size (e.g., '2.5 MB')
 * 
 * @example
 * const size = formatFileSize(1024); // Returns '1 KB'
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ==============================================
// EXPORTS
// ==============================================

export {
  // File Management
  cleanupFiles,
  validateFile,
  formatFileSize,
  
  // Report Generation
  generateCsv,
  prepareExportData,
  
  // Sharing
  shareFiles
};

