// Enhanced exportUtils.js
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

/**
 * Shares files on native platforms with better error handling
 * @param {Array<string>} filePaths - Array of file paths to share
 * @param {string} title - Title for the share dialog
 * @param {string} mimeType - MIME type of the file
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
 * Generates a comprehensive CSV file from chart data and parameters
 * @param {Array<Object>} chartData - Raw chart data points
 * @param {Array<Object>} processedParameters - Processed parameter data
 * @param {string} insights - AI-generated insights text
 * @param {Object} reportMetadata - Additional report metadata
 * @returns {Promise<{filePath: string, fileName: string}>} - Path to the generated CSV file
 */
const generateCsv = async (chartData, processedParameters, insights, reportMetadata = {}) => {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const csvFileName = `PureFlow_Report_${timestamp}.csv`;
    const documentsPath = FileSystem.documentDirectory;
    const filePath = `${documentsPath}${csvFileName}`;

    let csvContent = '';

    // Report Header
    csvContent += `PureFlow Water Quality Report\n`;
    csvContent += `Generated On: ${new Date().toLocaleString()}\n`;
    csvContent += `Time Period: ${reportMetadata.timePeriod || 'Not specified'}\n`;
    csvContent += `Total Data Points: ${chartData?.length || 0}\n`;
    csvContent += `\n`;

    // Overall Insights Section
    if (insights) {
      csvContent += `AI-Generated Insights\n`;
      csvContent += `"${insights.replace(/"/g, '""').replace(/\n/g, ' ')}"\n`;
      csvContent += `\n`;
    }

    // Parameter Overview Section
    if (processedParameters && processedParameters.length > 0) {
      csvContent += `Parameter Summary\n`;
      csvContent += `Parameter,Current Value,Unit,Status,Safe Range,Min Value,Max Value,Analysis\n`;
      
      processedParameters.forEach(param => {
        const analysis = (param.analysis || '').replace(/"/g, '""').replace(/\n/g, ' ');
        csvContent += `${param.parameter || ''},${param.value || ''},${param.unit || ''},${param.status || ''},${param.safeRange || ''},${param.minValue || ''},${param.maxValue || ''},"${analysis}"\n`;
      });
      csvContent += `\n`;
    }

    // Raw Sensor Data Section
    if (chartData && chartData.length > 0) {
      csvContent += `Raw Sensor Data\n`;
      
      // Get all unique keys from the data
      const allKeys = new Set();
      chartData.forEach(item => {
        if (item && typeof item === 'object') {
          Object.keys(item).forEach(key => allKeys.add(key));
        }
      });
      
      const headers = Array.from(allKeys);
      csvContent += headers.join(',') + '\n';
      
      // Add data rows
      chartData.forEach(item => {
        if (item && typeof item === 'object') {
          const row = headers.map(key => {
            let value = item[key];
            if (value === null || value === undefined) {
              return '';
            }
            // Handle different data types
            if (typeof value === 'string') {
              // Escape quotes and wrap in quotes if contains comma or quote
              if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
            }
            return value;
          });
          csvContent += row.join(',') + '\n';
        }
      });
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
 * Validates file before sharing
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} - Whether file is valid
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
 * Clean up temporary files
 * @param {Array<string>} filePaths - Array of file paths to clean up
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
 * Get file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export {
  cleanupFiles,
  formatFileSize, generateCsv,
  shareFiles,
  validateFile
};
