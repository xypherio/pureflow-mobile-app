import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import { Platform } from 'react-native';

export const generatePdfReport = async (reportData, options = {}) => {
  try {
    const {
      title = 'Water Quality Report',
      dateRange = 'Custom Range',
      parameters = {},
      trends = {},
      recommendations = []
    } = reportData;

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Generate HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>${title}</title>
        <style>
          @page {
            size: 8.5in 13in;
            margin: 0.5in;
          }
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #1a2d51;
            padding-bottom: 10px;
          }
          .header h1 {
            color: #1a2d51;
            margin: 0;
            font-size: 24px;
          }
          .subheader {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 12px;
            color: #666;
          }
          .section {
            margin-bottom: 20px;
          }
          .section-title {
            background-color: #f0f4f8;
            padding: 8px 12px;
            font-weight: bold;
            color: #1a2d51;
            margin-bottom: 10px;
            border-left: 4px solid #3b82f6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }
          .status-normal { background-color: #d1fae5; color: #065f46; }
          .status-warning { background-color: #fef3c7; color: #92400e; }
          .status-critical { background-color: #fee2e2; color: #991b1b; }
          .chart-placeholder {
            background-color: #f8fafc;
            border: 1px dashed #cbd5e1;
            padding: 20px;
            text-align: center;
            color: #64748b;
            margin: 10px 0;
          }
          .recommendation {
            margin-bottom: 8px;
            padding-left: 15px;
            position: relative;
          }
          .recommendation:before {
            content: '•';
            position: absolute;
            left: 0;
            color: #3b82f6;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
        </div>
        
        <div class="subheader">
          <div>Date Range: ${dateRange}</div>
          <div>Generated on: ${currentDate}</div>
        </div>

        <!-- Overall Water Quality Status -->
        <div class="section">
          <div class="section-title">Overall Water Quality Status</div>
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Average Value</th>
                <th>Safe Range</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(parameters).map(([param, data]) => {
                const statusClass = data.status ? `status-${data.status}` : '';
                return `
                  <tr>
                    <td>${data.displayName || param}</td>
                    <td>${data.average} ${data.unit || ''}</td>
                    <td>${data.safeRange || 'N/A'}</td>
                    <td><span class="status ${statusClass}">${data.status || 'N/A'}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Detailed Report -->
        <div class="section">
          <div class="section-title">Detailed Report</div>
          ${Object.entries(parameters).map(([param, data]) => {
            const trendData = trends[param] || [];
            const changePercentage = data.change ? Math.abs(data.change).toFixed(1) : 0;
            const changeDirection = data.change >= 0 ? 'increase' : 'decrease';
            
            return `
              <div style="margin-bottom: 25px;">
                <h3>${data.displayName || param}</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <div>Average: <strong>${data.average} ${data.unit || ''}</strong></div>
                  <div>Change: <strong>${changePercentage}% ${changeDirection}</strong></div>
                  <div>Status: <strong>${data.status || 'N/A'}</strong></div>
                </div>
                <div class="chart-placeholder">
                  Trend chart for ${data.displayName || param}
                  <!-- In a real implementation, this would be replaced with an actual chart image -->
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Recommendations -->
        ${recommendations.length > 0 ? `
          <div class="section">
            <div class="section-title">Recommendations</div>
            <div>
              ${recommendations.map(rec => 
                `<div class="recommendation">${rec}</div>`
              ).join('')}
            </div>
          </div>
        ` : ''}

        <div class="footer">
          This report was generated by PureFlow Water Quality Monitoring System
        </div>
      </body>
      </html>
    `;

    const { uri: pdfUri } = await Print.printToFileAsync({
      html: htmlContent,
      width: 8.5 * 72, // 8.5in * 72dpi
      height: 13 * 72, // 13in * 72dpi
      base64: false,
    });

    // Create a more descriptive filename
    const fileName = `WaterQualityReport_${new Date().getTime()}.pdf`;
    const newPath = `${FileSystem.documentDirectory}${fileName}`;
    
    // Move the file to a more permanent location
    await FileSystem.moveAsync({
      from: pdfUri,
      to: newPath,
    });

    return {
      filePath: newPath,
      fileTitle: fileName,
    };
  } catch (error) {
    console.error('Error capturing component as PDF:', error);
    throw error;
  }
};  

export const generateAndSharePdf = async (reportData, options = {}) => {
  try {
    const { filePath, fileTitle } = options.captureComponentRef
      ? await captureAndSharePdf(options.captureComponentRef, options)
      : await generatePdfReport(reportData, options);

    // Share the PDF using expo-sharing
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/pdf',
      dialogTitle: fileTitle,
      UTI: 'com.adobe.pdf'
    });

    return { success: true, filePath };
  } catch (error) {
    console.error('Error generating and sharing PDF:', error);
    throw error;
  }
};
