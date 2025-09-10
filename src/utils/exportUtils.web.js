// src/utils/exportUtils.web.js
// This file provides web-compatible implementations for report generation and sharing.

/**
 * Generates a water quality report in PDF or CSV format for web.
 * On web, this will typically trigger a download or print dialog.
 * @param {Array<Object>} data - Array of { param, value, status } for parameters table.
 * @param {string} insights - AI-generated insights string.
 * @param {string | null} chartBase64 - Optional Base64 string of a chart image.
 * @param {'pdf' | 'csv'} type - The type of report to generate ('pdf' or 'csv').
 * @returns {Promise<{ filePath: string }>} - A promise that resolves when the report is generated/downloaded.
 */
export const generateReport = async (data, insights, chartBase64 = null, type = 'pdf') => {
  if (type === 'pdf') {
    // --- PDF Generation for Web (using print dialog) ---
    const htmlContent = createHtmlContent(data, insights, chartBase64);

    // Create a hidden iframe to render the HTML and trigger print
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    return new Promise((resolve, reject) => {
      iframe.onload = () => {
        try {
          const doc = iframe.contentWindow.document;
          doc.open();
          doc.write(htmlContent);
          doc.close();

          iframe.contentWindow.focus();
          iframe.contentWindow.print();

          // Clean up the iframe after a short delay
          setTimeout(() => {
            document.body.removeChild(iframe);
            resolve({ filePath: 'Report generated via print dialog' }); // Indicate success
          }, 1000); // Give some time for the print dialog to appear
        } catch (error) {
          document.body.removeChild(iframe);
          console.error('Error generating PDF via print dialog:', error);
          reject(new Error(`Failed to generate PDF: ${error.message}`));
        }
      };
      iframe.onerror = (error) => {
        document.body.removeChild(iframe);
        console.error('Iframe loading error:', error);
        reject(new Error('Failed to load iframe for PDF generation.'));
      };
    });

  } else if (type === 'csv') {
    // --- CSV Generation for Web (triggers download) ---
    const csvHeader = 'Parameter,Value,Unit,Status\n';
    const csvRows = data.map(item => `${item.param},"${item.value}",${item.unit || ''},${item.status}`).join('\n');
    const csvContent = csvHeader + csvRows;
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvFileName = 'Water_Quality_Report.csv';

    // Trigger download for CSV
    const a = document.createElement('a');
    a.href = csvUrl;
    a.download = csvFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(csvUrl);

    return { filePath: csvUrl }; // Return URL for web
  } else {
    throw new Error('Invalid report type specified. Must be "pdf" or "csv".');
  }
};

/**
 * Creates the HTML content for the PDF report.
 * (Same as native, but included here for self-containment)
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

/**
 * Shares files for web.
 * On web, this typically involves using the Web Share API or a fallback.
 * @param {string[]} filePaths - An array of file paths (or URLs for web) to share.
 * @param {string} title - The title for the share dialog.
 */
export const shareFiles = async (filePaths, title = 'Share Report') => {
  console.warn('File sharing is not fully implemented for web. Attempting Web Share API.');
  try {
    if (!filePaths || filePaths.length === 0) {
      throw new Error('No files provided for sharing.');
    }

    // For web, filePaths might be URLs or local file paths that need to be fetched
    const filesToShare = [];
    for (const path of filePaths) {
      try {
        const response = await fetch(path);
        const blob = await response.blob();
        const fileName = path.split('/').pop();
        filesToShare.push(new File([blob], fileName, { type: blob.type }));
      } catch (fetchError) {
        console.warn(`Could not fetch file for sharing: ${path}. Falling back to URL sharing if possible.`);
        // If fetching fails, try to share as URL
      }
    }

    if (navigator.share) {
      await navigator.share({
        title: title,
        text: 'Check out this report!',
        url: filePaths[0], // Share the first URL as a fallback if filesToShare is empty
        files: filesToShare.length > 0 ? filesToShare : undefined,
      });
      console.log('Content shared successfully via Web Share API.');
    } else {
      alert('Web Share API is not supported in this browser. You can manually download the files.');
      // Fallback: trigger downloads if Web Share API is not available
      filePaths.forEach(path => {
        const a = document.createElement('a');
        a.href = path;
        a.download = path.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    }
  } catch (error) {
    console.error('Error sharing files on web:', error);
    throw new Error(`Failed to share files on web: ${error.message}`);
  }
};
