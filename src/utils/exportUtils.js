import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

/**
 * Exports data as a PDF file
 * @param {Object} options - Export options
 * @param {Object} options.reportData - The report data to export
 * @param {Object} options.componentRef - Reference to the component for capture
 * @returns {Promise<void>}
 */
export const exportAsPdf = async ({ reportData, componentRef }) => {
  try {
    console.log('Starting PDF export...');
    console.log('Component ref:', componentRef);
    
    if (!componentRef) {
      throw new Error('Component reference is undefined');
    }
    
    if (!componentRef.current) {
      console.warn('Component ref current is null, attempting to use ref directly');
      // Try to use the ref directly if current is not available
      if (typeof componentRef.measure === 'function') {
        componentRef = { current: componentRef };
      } else {
        throw new Error('Component reference is not valid for capture');
      }
    }

    console.log('Capturing component as image...');
    const uri = await captureRef(componentRef, {
      format: 'png',
      quality: 0.8,
      result: 'tmpfile',
    });
    
    if (!uri) {
      throw new Error('Failed to capture component');
    }

    // Create HTML content for the PDF
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial; padding: 20px; }
            h1 { color: #1a2d51; }
            .header { text-align: center; margin-bottom: 20px; }
            .content { margin-top: 20px; }
            .timestamp { font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Water Quality Report</h1>
            <p class="timestamp">Generated on: ${new Date().toLocaleString()}</p>
          </div>
          <div class="content">
            <img src="${uri}" style="width: 100%;" />
          </div>
        </body>
      </html>
    `;

    // Generate and save the PDF
    const { uri: pdfUri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Share the PDF
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Water Quality Report',
      UTI: 'com.adobe.pdf',
    });

    return { success: true };
  } catch (error) {
    console.error('PDF export failed:', error);
    throw new Error('Failed to export as PDF');
  }
};

/**
 * Exports data as a CSV file
 * @param {Object} options - Export options
 * @param {Object} options.reportData - The report data to export
 * @returns {Promise<void>}
 */
export const exportAsCsv = async ({ reportData }) => {
  try {
    if (!reportData || !reportData.readings || !Array.isArray(reportData.readings)) {
      throw new Error('Invalid report data for CSV export');
    }

    // Extract headers from the first reading
    const headers = ['Date', 'pH', 'Temperature', 'Salinity', 'Turbidity', 'Status'];
    
    // Convert each reading to a CSV row
    const rows = reportData.readings.map(reading => {
      return [
        new Date(reading.datetime).toLocaleString(),
        reading.pH?.toFixed(2) || 'N/A',
        reading.temperature?.toFixed(2) || 'N/A',
        reading.salinity?.toFixed(2) || 'N/A',
        reading.turbidity?.toFixed(2) || 'N/A',
        reading.status || 'unknown',
      ].join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create a temporary file path
    const fileUri = `${FileSystem.documentDirectory}water_quality_report_${Date.now()}.csv`;
    
    // Write the CSV content to the file
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the CSV file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Water Quality Data',
      UTI: 'public.comma-separated-values-text',
    });

    return { success: true };
  } catch (error) {
    console.error('CSV export failed:', error);
    throw new Error('Failed to export as CSV');
  }
};

/**
 * Handles the export action based on the selected format
 * @param {string} format - The export format ('pdf', 'csv', 'share')
 * @param {Object} options - Export options
 * @param {Object} options.reportData - The report data to export
 * @param {Object} options.componentRef - Reference to the component for capture
 * @param {Function} options.onStart - Callback when export starts
 * @param {Function} options.onComplete - Callback when export completes
 * @param {Function} options.onError - Callback when export fails
 */
export const handleExport = async (format, { reportData, componentRef, onStart, onComplete, onError }) => {
  console.log(`Starting export with format: ${format}`);
  console.log('Export options:', { hasReportData: !!reportData, hasComponentRef: !!componentRef });
  
  try {
    onStart?.(format);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let result;
    switch (format) {
      case 'pdf':
        console.log('Exporting as PDF...');
        if (!componentRef) {
          throw new Error('Component reference is required for PDF export');
        }
        result = await exportAsPdf({ reportData, componentRef });
        break;
      case 'csv':
        console.log('Exporting as CSV...');
        if (!reportData) {
          throw new Error('Report data is required for CSV export');
        }
        result = await exportAsCsv({ reportData });
        break;
      case 'share':
        console.log('Preparing share...');
        if (!componentRef) {
          throw new Error('Component reference is required for sharing');
        }
        result = await exportAsPdf({ reportData, componentRef });
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    onComplete?.(format, result);
    return result;
  } catch (error) {
    console.error(`Export failed (${format}):`, error);
    onError?.(format, error);
    throw error;
  }
};
