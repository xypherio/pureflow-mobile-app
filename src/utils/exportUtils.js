import { Platform } from 'react-native';

let generateReport;
let shareFiles;

if (Platform.OS === 'web') {
  // Import web-specific implementations
  const webExports = require('./exportUtils.web');
  generateReport = webExports.generateReport;
  shareFiles = webExports.shareFiles;
} else {
  // Import native-specific implementations
  const RNHTMLtoPDF = require('react-native-html-to-pdf').default;
  // RNFS is removed as CSV exporting is no longer supported.

  /**
   * Generates a water quality report in PDF format for mobile.
   * @param {Array<Object>} data - Array of { param, value, status } for parameters table.
   * @param {string} insights - AI-generated insights string.
   * @param {string | null} chartBase64 - Optional Base64 string of a chart image.
   * @returns {Promise<{ filePath: string }>} - Path to the generated file.
   */
  generateReport = async (data, insights, chartBase64 = null) => {
    try {
      // --- PDF Generation ---
      const htmlContent = createHtmlContent(data, insights, chartBase64);

      const options = {
        html: htmlContent,
        fileName: 'Water_Quality_Report',
        directory: 'Documents',
        base64: false,
        height: 792, // Short bond paper height in pts
        width: 612,  // Short bond paper width in pts
      };

      const file = await RNHTMLtoPDF.convert(options);
      console.log('PDF generated at:', file.filePath);
      return { filePath: file.filePath };
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  };

  /**
   * Placeholder for shareFiles as the feature is removed.
   */
  shareFiles = async () => {
    console.warn('File sharing feature is not implemented.');
    throw new Error('File sharing is not available.');
  };
}

/**
 * Creates the HTML content for the PDF report.
 * This function is common to both web and native, so it's defined once.
 */
const createHtmlContent = (data, insights, chartBase64) => {
  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            padding: 0;
            margin: 0;
            color: #333;
            -webkit-print-color-adjust: exact;
          }
          .container {
            width: 100%;
            padding: 20px;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          h1 {
            color: #1a2d51;
            font-size: 28px;
            margin-bottom: 5px;
          }
          .timestamp {
            font-size: 14px;
            color: #666;
          }
          .section {
            margin-bottom: 25px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 8px;
            border: 1px solid #eee;
          }
          h2 {
            color: #1a2d51;
            font-size: 20px;
            margin-top: 0;
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
          }
          p {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
            font-size: 15px;
          }
          th {
            background-color: #eef;
            font-weight: bold;
            color: #1a2d51;
          }
          .status-normal { color: #22c55e; font-weight: bold; }
          .status-warning { color: #eab308; font-weight: bold; }
          .status-critical { color: #ef4444; font-weight: bold; }
          .chart-container {
            text-align: center;
            margin-top: 20px;
            margin-bottom: 20px;
          }
          .chart-container img {
            max-width: 100%;
            height: auto;
            border: 1px solid #eee;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Water Quality Report</h1>
            <p class="timestamp">Generated on: ${new Date().toLocaleString()}</p>
          </div>

          ${insights ? `
            <div class="section">
              <h2>AI-Generated Insights</h2>
              <p>${insights}</p>
            </div>
          ` : ''}

          <div class="section">
            <h2>Parameter Overview</h2>
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(item => `
                  <tr>
                    <td>${item.param}</td>
                    <td>${item.value} ${item.unit || ''}</td>
                    <td class="status-${item.status.toLowerCase()}">${item.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          ${chartBase64 ? `
            <div class="section chart-container">
              <h2>Data Visualization</h2>
              <img src="data:image/png;base64,${chartBase64}" alt="Water Quality Chart" />
            </div>
          ` : ''}
        </div>
      </body>
    </html>
  `;
};

export { generateReport, shareFiles };
