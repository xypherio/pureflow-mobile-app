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
 * Comprehensively sanitizes text for PDF encoding by converting problematic Unicode characters
 * to their closest ASCII equivalents or safe alternatives. This ensures compatibility with
 * WinAnsi encoding used by pdf-lib and prevents PDF generation errors.
 *
 * This function maps a wide range of Unicode characters including:
 * - Various types of spaces (non-breaking, narrow, zero-width, etc.)
 * - Typographic punctuation (smart quotes, dashes, etc.)
 * - Latin accented characters
 * - Common symbols and fractions
 * - Currency symbols
 * - Mathematical operators
 * - And many more...
 *
 * @param {string} text - The input text to sanitize
 * @returns {string} - Sanitized text safe for PDF generation
 */
const sanitizeTextForPDF = (text) => {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);

  let sanitized = text;

  // Comprehensive Unicode character mapping
  const unicodeMap = {
    // Spaces and invisible characters
    '\u00a0': ' ',    // Non-breaking space
    '\u202f': ' ',    // Narrow no-break space
    '\u2007': ' ',    // Figure space
    '\u2000': ' ',    // En quad
    '\u2001': ' ',    // Em quad
    '\u2002': ' ',    // En space
    '\u2003': ' ',    // Em space
    '\u2004': ' ',    // Three-per-em space
    '\u2005': ' ',    // Four-per-em space
    '\u2006': ' ',    // Six-per-em space
    '\ufeff': '',     // Zero width no-break space (BOM)
    '\u200b': '',     // Zero width space
    '\u200c': '',     // Zero width non-joiner
    '\u200d': '',     // Zero width joiner
    '\u200e': '',     // Left-to-right mark
    '\u200f': '',     // Right-to-left mark

    // Quotation marks and apostrophes
    '\u2018': "'",    // Left single quotation mark
    '\u2019': "'",    // Right single quotation mark
    '\u201a': "'",    // Single low-9 quotation mark
    '\u201b': "'",    // Single high-reversed-9 quotation mark
    '\u201c': '"',    // Left double quotation mark
    '\u201d': '"',    // Right double quotation mark
    '\u201e': '"',    // Double low-9 quotation mark
    '\u201f': '"',    // Double high-reversed-9 quotation mark
    '\u2039': '<',    // Single left-pointing angle quotation mark
    '\u203a': '>',    // Single right-pointing angle quotation mark
    '\u00ab': '<<',   // Left-pointing double angle quotation mark
    '\u00bb': '>>',   // Right-pointing double angle quotation mark

    // Dashes and hyphens
    '\u2013': '-',    // En dash
    '\u2014': '-',    // Em dash
    '\u2015': '-',    // Horizontal bar
    '\u2212': '-',    // Minus sign
    '\u00ad': '-',    // Soft hyphen

    // Ligatures
    '\ufb00': 'ff',   // Latin small ligature ff
    '\ufb01': 'fi',   // Latin small ligature fi
    '\ufb02': 'fl',   // Latin small ligature fl
    '\ufb03': 'ffi',  // Latin small ligature ffi
    '\ufb04': 'ffl',  // Latin small ligature ffl
    '\ufb05': 'ft',   // Latin small ligature ft
    '\ufb06': 'st',   // Latin small ligature st

    // Superscripts and subscripts
    '\u00b2': '^2',   // Superscript two
    '\u00b3': '^3',   // Superscript three
    '\u00b9': '^1',   // Superscript one
    '\u2070': '^0',   // Superscript zero
    '\u2071': '^i',   // Superscript latin small letter i
    '\u2074': '^4',   // Superscript four
    '\u2075': '^5',   // Superscript five
    '\u2076': '^6',   // Superscript six
    '\u2077': '^7',   // Superscript seven
    '\u2078': '^8',   // Superscript eight
    '\u2079': '^9',   // Superscript nine
    '\u2080': '_0',   // Subscript zero
    '\u2081': '_1',   // Subscript one
    '\u2082': '_2',   // Subscript two
    '\u2083': '_3',   // Subscript three
    '\u2084': '_4',   // Subscript four
    '\u2085': '_5',   // Subscript five
    '\u2086': '_6',   // Subscript six
    '\u2087': '_7',   // Subscript seven
    '\u2088': '_8',   // Subscript eight
    '\u2089': '_9',   // Subscript nine

    // Fractions
    '\u00bc': '1/4',  // Vulgar fraction one quarter
    '\u00bd': '1/2',  // Vulgar fraction one half
    '\u00be': '3/4',  // Vulgar fraction three quarters
    '\u2150': '1/7',  // Vulgar fraction one seventh
    '\u2151': '1/9',  // Vulgar fraction one ninth
    '\u2152': '1/10', // Vulgar fraction one tenth
    '\u2153': '1/3',  // Vulgar fraction one third
    '\u2154': '2/3',  // Vulgar fraction two thirds
    '\u2155': '1/5',  // Vulgar fraction one fifth
    '\u2156': '2/5',  // Vulgar fraction two fifths
    '\u2157': '3/5',  // Vulgar fraction three fifths
    '\u2158': '4/5',  // Vulgar fraction four fifths
    '\u2159': '1/6',  // Vulgar fraction one sixth
    '\u215a': '5/6',  // Vulgar fraction five sixths
    '\u215b': '1/8',  // Vulgar fraction one eighth
    '\u215c': '3/8',  // Vulgar fraction three eighths
    '\u215d': '5/8',  // Vulgar fraction five eighths
    '\u215e': '7/8',  // Vulgar fraction seven eighths
    '\u2189': '0/3',  // Vulgar fraction zero thirds

    // Mathematical operators
    '\u00d7': 'x',    // Multiplication sign
    '\u00f7': '/',    // Division sign
    '\u2219': '.',    // Bullet operator
    '\u221a': 'sqrt', // Square root
    '\u2248': '~=',   // Almost equal to
    '\u2260': '!=',   // Not equal to
    '\u2264': '<=',   // Less-than or equal to
    '\u2265': '>=',   // Greater-than or equal to
    '\u00b1': '+-',   // Plus-minus sign

    // Arrows and symbols
    '\u2190': '<-',   // Leftwards arrow
    '\u2192': '->',   // Rightwards arrow
    '\u2194': '<->',  // Left right arrow
    '\u21d2': '=>',   // Rightwards double arrow
    '\u21d0': '<=',   // Leftwards double arrow
    '\u2022': '*',    // Bullet
    '\u2023': '*',    // Triangular bullet
    '\u25cf': '*',    // Black circle
    '\u2026': '...',  // Horizontal ellipsis
    '\u00a9': '(C)',  // Copyright sign
    '\u00ae': '(R)',  // Registered sign
    '\u2122': '(TM)', // Trade mark sign

    // Currency symbols (common ones)
    '\u20ac': 'EUR',  // Euro sign
    '\u00a3': 'GBP',  // Pound sign
    '\u00a5': 'JPY',  // Yen sign
    '\u20a9': 'KRW',  // Won sign
    '\u20b1': 'PHP',  // Peso sign

    // Latin accented characters (most common)
    '\u00c0': 'A',    // Latin capital letter A with grave
    '\u00c1': 'A',    // Latin capital letter A with acute
    '\u00c2': 'A',    // Latin capital letter A with circumflex
    '\u00c3': 'A',    // Latin capital letter A with tilde
    '\u00c4': 'A',    // Latin capital letter A with diaeresis
    '\u00c5': 'A',    // Latin capital letter A with ring above
    '\u00c6': 'AE',   // Latin capital letter AE
    '\u00c7': 'C',    // Latin capital letter C with cedilla
    '\u00c8': 'E',    // Latin capital letter E with grave
    '\u00c9': 'E',    // Latin capital letter E with acute
    '\u00ca': 'E',    // Latin capital letter E with circumflex
    '\u00cb': 'E',    // Latin capital letter E with diaeresis
    '\u00cc': 'I',    // Latin capital letter I with grave
    '\u00cd': 'I',    // Latin capital letter I with acute
    '\u00ce': 'I',    // Latin capital letter I with circumflex
    '\u00cf': 'I',    // Latin capital letter I with diaeresis
    '\u00d1': 'N',    // Latin capital letter N with tilde
    '\u00d2': 'O',    // Latin capital letter O with grave
    '\u00d3': 'O',    // Latin capital letter O with acute
    '\u00d4': 'O',    // Latin capital letter O with circumflex
    '\u00d5': 'O',    // Latin capital letter O with tilde
    '\u00d6': 'O',    // Latin capital letter O with diaeresis
    '\u00d8': 'O',    // Latin capital letter O with stroke
    '\u00d9': 'U',    // Latin capital letter U with grave
    '\u00da': 'U',    // Latin capital letter U with acute
    '\u00db': 'U',    // Latin capital letter U with circumflex
    '\u00dc': 'U',    // Latin capital letter U with diaeresis
    '\u00dd': 'Y',    // Latin capital letter Y with acute
    '\u00df': 'ss',   // Latin small letter sharp s
    '\u00e0': 'a',    // Latin small letter a with grave
    '\u00e1': 'a',    // Latin small letter a with acute
    '\u00e2': 'a',    // Latin small letter a with circumflex
    '\u00e3': 'a',    // Latin small letter a with tilde
    '\u00e4': 'a',    // Latin small letter a with diaeresis
    '\u00e5': 'a',    // Latin small letter a with ring above
    '\u00e6': 'ae',   // Latin small letter ae
    '\u00e7': 'c',    // Latin small letter c with cedilla
    '\u00e8': 'e',    // Latin small letter e with grave
    '\u00e9': 'e',    // Latin small letter e with acute
    '\u00ea': 'e',    // Latin small letter e with circumflex
    '\u00eb': 'e',    // Latin small letter e with diaeresis
    '\u00ec': 'i',    // Latin small letter i with grave
    '\u00ed': 'i',    // Latin small letter i with acute
    '\u00ee': 'i',    // Latin small letter i with circumflex
    '\u00ef': 'i',    // Latin small letter i with diaeresis
    '\u00f1': 'n',    // Latin small letter n with tilde
    '\u00f2': 'o',    // Latin small letter o with grave
    '\u00f3': 'o',    // Latin small letter o with acute
    '\u00f4': 'o',    // Latin small letter o with circumflex
    '\u00f5': 'o',    // Latin small letter o with tilde
    '\u00f6': 'o',    // Latin small letter o with diaeresis
    '\u00f8': 'o',    // Latin small letter o with stroke
    '\u00f9': 'u',    // Latin small letter u with grave
    '\u00fa': 'u',    // Latin small letter u with acute
    '\u00fb': 'u',    // Latin small letter u with circumflex
    '\u00fc': 'u',    // Latin small letter u with diaeresis
    '\u00fd': 'y',    // Latin small letter y with acute
    '\u00ff': 'y',    // Latin small letter y with diaeresis

    // Degree and other units
    '\u00b0': 'deg',  // Degree sign
    '\u00ba': 'deg',  // Masculine ordinal indicator
    '\u2032': "'",    // Prime (feet)
    '\u2033': '"',    // Double prime (inches)
  };

  // Apply all character mappings
  for (const [unicodeChar, replacement] of Object.entries(unicodeMap)) {
    const regex = new RegExp(unicodeChar, 'g');
    sanitized = sanitized.replace(regex, replacement);
  }

  // Clean up any remaining control characters and non-printable characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // Fallback: Replace any remaining Unicode characters above ASCII (non-Basic Latin)
  // that might not be supported by WinAnsi encoding in PDF. This handles any edge cases
  // where particular Unicode characters like U+202F (narrow no-break space) could cause encoding errors.
  sanitized = sanitized.replace(/[^\x00-\x7F]/g, '');

  // Normalize multiple consecutive spaces to single space
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Trim leading/trailing whitespace
  return sanitized.trim();
};

/**
 * Sanitizes weather data object by cleaning all text fields
 */
const sanitizeWeatherData = (weatherData) => {
  if (!weatherData) return weatherData;

  return {
    ...weatherData,
    label: sanitizeTextForPDF(weatherData.label) || 'N/A',
    temp: weatherData.temp || 'N/A',
    city: sanitizeTextForPDF(weatherData.city) || 'N/A',
    raw: weatherData.raw // Keep raw data untouched for debugging
  };
};

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
    // SECTION 4: EXECUTIVE SUMMARY
    // ============================================
    csvContent += `EXECUTIVE SUMMARY\n`;
    if (exportData.executiveSummary) {
      csvContent += `${escapeCsv(exportData.executiveSummary)}\n`;
    } else {
      csvContent += `Executive summary not available\n`;
    }
    csvContent += `\n`;

    // ============================================
    // SECTION 5: ENVIRONMENTAL CONTEXT
    // ============================================
    csvContent += `ENVIRONMENTAL CONTEXT\n`;
    if (exportData.environmental?.weather) {
      csvContent += `Weather Conditions,${escapeCsv(exportData.environmental.weather.description)}\n`;
      if (exportData.environmental.weather.humidity) {
        csvContent += `Humidity,${exportData.environmental.weather.humidity}%\n`;
      }
      if (exportData.environmental.weather.windSpeed) {
        csvContent += `Wind Speed,${exportData.environmental.weather.windSpeed} m/s\n`;
      }
    } else {
      csvContent += `Weather data not available during report generation\n`;
    }
    csvContent += `\n`;

    // ============================================
    // SECTION 6: REGULATORY COMPLIANCE DASHBOARD
    // ============================================
    csvContent += `REGULATORY COMPLIANCE DASHBOARD\n`;
    if (exportData.compliance) {
      const compliance = exportData.compliance;
      csvContent += `Overall Compliance,${compliance.overallCompliance}%\n`;
      csvContent += `Compliant Parameters,${compliance.compliantParameters}/${compliance.totalParameters}\n`;
      if (compliance.criticalIssues > 0) {
        csvContent += `Critical Issues,${compliance.criticalIssues}\n`;
      }
      if (compliance.warningIssues > 0) {
        csvContent += `Warning Issues,${compliance.warningIssues}\n`;
      }
    } else {
      csvContent += `Compliance data not available\n`;
    }
    csvContent += `\n`;

    // ============================================
    // SECTION 7: SAMPLING INFORMATION
    // ============================================
    csvContent += `SAMPLING INFORMATION\n`;
    if (exportData.samplingInfo) {
      const sampling = exportData.samplingInfo;
      csvContent += `Time Period,${escapeCsv(sampling.timePeriod)}\n`;
      csvContent += `Data Points,${sampling.dataPoints}\n`;
      csvContent += `Reporting Date,${escapeCsv(sampling.reportingDate)}\n`;
      csvContent += `Location,${escapeCsv(sampling.location)}\n`;
      csvContent += `System Version,${escapeCsv(sampling.systemVersion)}\n`;
      csvContent += `Sampling Method,${escapeCsv(sampling.samplingMethod)}\n`;
    }
    csvContent += `\n`;

    // ============================================
    // SECTION 8: ACTION PRIORITY MATRIX
    // ============================================
    csvContent += `ACTION PRIORITY MATRIX\n`;
    if (insights.priorityMatrix) {
      const matrix = insights.priorityMatrix;

      if (matrix.critical && matrix.critical.length > 0) {
        csvContent += `CRITICAL PRIORITY ACTIONS\n`;
        matrix.critical.forEach((item) => {
          csvContent += `${item.id}. ${escapeCsv(item.text)} (${item.parameter})\n`;
        });
        csvContent += `\n`;
      }

      if (matrix.high && matrix.high.length > 0) {
        csvContent += `HIGH PRIORITY ACTIONS\n`;
        matrix.high.forEach((item) => {
          csvContent += `${item.id}. ${escapeCsv(item.text)} (${item.parameter})\n`;
        });
        csvContent += `\n`;
      }

      if (matrix.medium && matrix.medium.length > 0) {
        csvContent += `MEDIUM PRIORITY ACTIONS\n`;
        matrix.medium.forEach((item) => {
          csvContent += `${item.id}. ${escapeCsv(item.text)} (${item.parameter})\n`;
        });
        csvContent += `\n`;
      }

      if (matrix.low && matrix.low.length > 0) {
        csvContent += `LOW PRIORITY ACTIONS\n`;
        matrix.low.forEach((item) => {
          csvContent += `${item.id}. ${escapeCsv(item.text)} (${item.parameter})\n`;
        });
        csvContent += `\n`;
      }
    } else {
      csvContent += `No prioritized recommendations available\n\n`;
    }

    // ============================================
    // SECTION 9: OVERALL INSIGHTS & RECOMMENDATIONS
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
 * Merges report data, processed parameters, AI insights, weather data, and compliance info into a single object.
 *
 * @function prepareExportData
 * @param {Object} reportData - The main report data object containing metadata and WQI
 * @param {Array} processedParameters - Processed water quality parameter data
 * @param {Object} geminiResponse - AI-generated insights and recommendations
 * @param {Object} weatherData - Weather conditions during sampling period
 * @param {string} timePeriodFilter - Active time filter (daily/weekly/monthly)
 * @returns {Object} - Unified export data structure
 *
 * @example
 * const exportData = prepareExportData(reportData, processedParameters, geminiResponse, weatherData, activeFilter);
 */
const prepareExportData = (reportData, processedParameters, geminiResponse, weatherData, timePeriodFilter) => {
  // Import thresholds for compliance checking
  const { getWaterQualityThresholds } = require('../constants/thresholds');

  // Get regulatory thresholds
  const thresholds = getWaterQualityThresholds();

  // Sanitize weather data if provided
  const sanitizedWeatherData = sanitizeWeatherData(weatherData);

  // Base report metadata
  const exportData = {
    metadata: {
      title: "PureFlow Water Quality Report",
      generatedAt: new Date().toISOString(),
      timePeriod: timePeriodFilter || reportData.timePeriod || "N/A",
      overallStatus: reportData.overallStatus || "normal",
      wqi: reportData.wqi || { value: 0, status: "unknown" },
      reportDate: new Date().toLocaleDateString(),
      reportTime: new Date().toLocaleTimeString()
    },

    // Executive Summary - auto-generated based on data and sanitized
    executiveSummary: sanitizeTextForPDF(generateExecutiveSummary(reportData, timePeriodFilter)),

    // Weather & Environmental Context
    environmental: {
      weather: sanitizedWeatherData ? {
        temperature: sanitizedWeatherData.temp,
        humidity: sanitizedWeatherData.humidity,
        windSpeed: sanitizedWeatherData.windSpeed,
        conditions: sanitizedWeatherData.label,
        city: sanitizedWeatherData.city,
        description: sanitizeTextForPDF(`${sanitizedWeatherData.label} at ${sanitizedWeatherData.temp} in ${sanitizedWeatherData.city || 'Cebu City'}`)
      } : {
        temperature: 'N/A',
        humidity: null,
        windSpeed: null,
        conditions: 'Weather data unavailable',
        city: 'Cebu City',
        description: 'Weather data not available during report generation'
      }
    },

    // Parameters data with compliance status
    parameters: {
      ph: formatParameterDataWithCompliance(reportData.parameters?.pH, "pH", "", thresholds.pH),
      temperature: formatParameterDataWithCompliance(reportData.parameters?.temperature, "Temperature", "°C", thresholds.temperature),
      turbidity: formatParameterDataWithCompliance(reportData.parameters?.turbidity, "Turbidity", "NTU", thresholds.turbidity),
      salinity: formatParameterDataWithCompliance(reportData.parameters?.salinity, "Salinity", "ppt", thresholds.salinity),
      tds: formatParameterData(reportData.parameters?.tds, "TDS", "mg/L", "0 - 1000 mg/L")
    },

    // Compliance Dashboard
    compliance: generateComplianceDashboard(reportData.parameters, thresholds),

    // Sampling Information
    samplingInfo: {
      timePeriod: timePeriodFilter || reportData.timePeriod || "N/A",
      dataPoints: processedParameters?.length || 0,
      reportingDate: new Date().toLocaleDateString(),
      reportingTime: new Date().toLocaleTimeString(),
      location: "Cebu City, Philippines",
      systemVersion: "PureFlow v1.0",
      samplingMethod: "Continuous IoT Sensor Monitoring"
    },

    // AI insights and recommendations with priority matrix - sanitized for Unicode safety
    insights: {
      overall: sanitizeTextForPDF(geminiResponse?.insights?.overallInsight || "No AI insights available"),
      forecast: sanitizeTextForPDF(geminiResponse?.forecast?.overallForecast || "No forecast available"),
      recommendations: (geminiResponse?.suggestions || []).map(rec => ({
        ...rec,
        recommendation: sanitizeTextForPDF(rec.recommendation || ''),
        details: sanitizeTextForPDF(rec.details || ''),
        parameter: sanitizeTextForPDF(rec.parameter || '')
      })),
      priorityMatrix: generatePriorityMatrix(
        (geminiResponse?.suggestions || []).map(rec => ({
          ...rec,
          recommendation: sanitizeTextForPDF(rec.recommendation || ''),
          details: sanitizeTextForPDF(rec.details || ''),
          parameter: sanitizeTextForPDF(rec.parameter || '')
        }))
      )
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
 * Generates an executive summary based on report data.
 * Creates a concise overview highlighting key findings and overall status.
 *
 * @private
 * @function generateExecutiveSummary
 * @param {Object} reportData - The main report data
 * @param {string} timePeriod - The time period filter (daily/weekly/monthly)
 * @returns {string} - Executive summary text
 */
const generateExecutiveSummary = (reportData, timePeriod) => {
  const wqi = reportData?.wqi?.value || 0;
  const status = reportData?.wqi?.status || "unknown";

  let statusSummary = "";
  if (status === "excellent") {
    statusSummary = "excellent with all parameters within optimal ranges";
  } else if (status === "good") {
    statusSummary = "good with minor parameter variations";
  } else if (status === "warning") {
    statusSummary = "requiring attention due to parameter warnings";
  } else if (status === "critical") {
    statusSummary = "critical requiring immediate corrective actions";
  } else {
    statusSummary = "under monitoring with preliminary assessments";
  }

  const criticalParams = [];
  if (reportData?.parameters?.pH?.status === "critical" || reportData?.parameters?.pH?.status === "warning") {
    criticalParams.push("pH");
  }
  if (reportData?.parameters?.temperature?.status === "critical" || reportData?.parameters?.temperature?.status === "warning") {
    criticalParams.push("temperature");
  }
  if (reportData?.parameters?.turbidity?.status === "critical" || reportData?.parameters?.turbidity?.status === "warning") {
    criticalParams.push("turbidity");
  }
  if (reportData?.parameters?.salinity?.status === "critical" || reportData?.parameters?.salinity?.status === "warning") {
    criticalParams.push("salinity");
  }

  let criticalText = "";
  if (criticalParams.length > 0) {
    criticalText = ` Special attention required for: ${criticalParams.join(", ")}.`;
  }

  const periodText = timePeriod === "daily" ? "24-hour monitoring period" :
                     timePeriod === "weekly" ? "7-day monitoring period" : "30-day monitoring period";

  return `This PureFlow water quality report covers the ${periodText} ending ${new Date().toLocaleDateString()}. ` +
         `The overall water quality status is ${statusSummary} (WQI: ${wqi}/100).${criticalText} ` +
         `Please review detailed measurements and AI insights for specific parameter recommendations.`;
};

/**
 * Formats water quality parameter data with compliance information.
 *
 * @private
 * @function formatParameterDataWithCompliance
 * @param {Object|null} paramData - Raw parameter data
 * @param {string} displayName - Human-readable parameter name
 * @param {string} unit - Measurement unit (e.g., '°C', 'NTU')
 * @param {Object} thresholds - Min/max thresholds for the parameter
 * @returns {Object} - Formatted parameter data object with compliance info
 */
const formatParameterDataWithCompliance = (paramData, displayName, unit, thresholds) => {
  const baseData = formatParameterData(paramData, displayName, unit, `${thresholds.min} - ${thresholds.max}`);

  if (!paramData || typeof paramData.average !== 'number') {
    return {
      ...baseData,
      compliance: {
        status: "unknown",
        compliant: false,
        deviation: null
      }
    };
  }

  const avg = paramData.average;
  const min = thresholds.min;
  const max = thresholds.max;

  let complianceStatus = "compliant";
  let compliant = true;
  let deviation = 0;

  if (avg < min) {
    complianceStatus = "below_minimum";
    compliant = false;
    deviation = avg - min;
  } else if (avg > max) {
    complianceStatus = "above_maximum";
    compliant = false;
    deviation = avg - max;
  }

  return {
    ...baseData,
    compliance: {
      status: complianceStatus,
      compliant,
      deviation: deviation.toFixed(2),
      thresholds: { min, max }
    }
  };
};

/**
 * Generates a compliance dashboard summarizing parameter adherence to standards.
 *
 * @private
 * @function generateComplianceDashboard
 * @param {Object} parameters - Raw parameter data
 * @param {Object} thresholds - Regulatory thresholds
 * @returns {Object} - Compliance dashboard data
 */
const generateComplianceDashboard = (parameters, thresholds) => {
  const dashboard = {
    overallCompliance: 0,
    compliantParameters: 0,
    totalParameters: 4, // pH, temperature, turbidity, salinity
    criticalIssues: 0,
    warningIssues: 0,
    parameterStatus: {}
  };

  // Calculate compliance for each parameter
  const paramMapping = [
    { key: 'pH', displayName: 'pH', thresholds: thresholds.pH },
    { key: 'temperature', displayName: 'Temperature', thresholds: thresholds.temperature },
    { key: 'turbidity', displayName: 'Turbidity', thresholds: thresholds.turbidity },
    { key: 'salinity', displayName: 'Salinity', thresholds: thresholds.salinity }
  ];

  paramMapping.forEach(({ key, displayName, thresholds: paramThresholds }) => {
    const paramData = parameters?.[key];
    let status = "unknown";
    let compliant = false;

    if (paramData && typeof paramData.average === 'number') {
      const avg = paramData.average;
      const min = paramThresholds.min;
      const max = paramThresholds.max;

      if (avg >= min && avg <= max) {
        status = "compliant";
        compliant = true;
        dashboard.compliantParameters++;
      } else if (avg < min) {
        status = "below";
      } else if (avg > max) {
        status = "above";
      }

      // Count critical/warning issues
      const paramStatus = paramData.status;
      if (paramStatus === "critical") {
        dashboard.criticalIssues++;
      } else if (paramStatus === "warning") {
        dashboard.warningIssues++;
      }
    }

    dashboard.parameterStatus[displayName] = {
      status,
      compliant,
      value: paramData?.average || null
    };
  });

  dashboard.overallCompliance = Math.round((dashboard.compliantParameters / dashboard.totalParameters) * 100);

  return dashboard;
};

/**
 * Generates a priority matrix for AI recommendations.
 * Categorizes recommendations by urgency level based on parameter status and insights.
 *
 * @private
 * @function generatePriorityMatrix
 * @param {Array} recommendations - Array of AI recommendations
 * @returns {Object} - Prioritized recommendations matrix
 */
const generatePriorityMatrix = (recommendations) => {
  const priorityMatrix = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };

  if (!recommendations || !Array.isArray(recommendations)) {
    return priorityMatrix;
  }

  recommendations.forEach((rec, index) => {
    const text = (rec.recommendation || rec.details || '').toLowerCase();
    const parameter = (rec.parameter || '').toLowerCase();

    // Simple priority logic based on keywords in recommendations
    let priority = "medium";

    // Critical priority - immediate action required
    if (text.includes("immediate") || text.includes("critical") || text.includes("urgent") ||
        text.includes("immediately") || text.includes("dangerous") || parameter === "ph") {
      priority = "critical";
    }
    // High priority - important but not immediate
    else if (text.includes("important") || text.includes("warning") || text.includes("attention") ||
             parameter === "temperature" || parameter === "turbidity") {
      priority = "high";
    }
    // Low priority - minor or general suggestions
    else if (text.includes("consider") || text.includes("suggest") || text.includes("optional") ||
             text.includes("general") || !parameter) {
      priority = "low";
    }

    priorityMatrix[priority].push({
      id: index + 1,
      text: rec.recommendation || rec.details || 'No recommendation text',
      parameter: rec.parameter || 'General',
      priority
    });
  });

  return priorityMatrix;
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
  sanitizeTextForPDF,

  // S/ Srng
  shareFiles
};
