import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { StyleSheet } from 'react-native';

const PdfGenerator = async (reportData) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Helper function to wrap text
  const wrapText = (text, font, fontSize, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const potentialLine = currentLine === '' ? word : `${currentLine} ${word}`;
      const textWidth = font.widthOfTextAtSize(potentialLine, fontSize);

      if (textWidth <= maxWidth) {
        currentLine = potentialLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines.filter(line => line !== '');
  };

  // Cover Page
  const coverPage = pdfDoc.addPage();
  coverPage.drawText('PureFlow Water Quality Report', {
    x: 50,
    y: 700,
    font,
    size: 30,
    color: rgb(0, 0.53, 0.71),
  });
  // Customizable: Modify the date format or text style
  coverPage.drawText(`Date: ${new Date().toLocaleDateString()}`, {
    x: 50,
    y: 650,
    font,
    size: 18,
    color: rgb(0, 0, 0),
  });

  // Overall Water Quality Status
  const statusPage = pdfDoc.addPage();
  statusPage.drawText('Overall Water Quality Status', {
    x: 50,
    y: 750,
    font,
    size: 24,
    color: rgb(0, 0.53, 0.71),
  });
  // Customizable: Modify overall status text and style
  statusPage.drawText(reportData.overallStatus, {
    x: 50,
    y: 700,
    font,
    size: 12,
    color: rgb(0, 0, 0),
  });

  // Detailed Parameter Reports
  const detailedPage = pdfDoc.addPage();
  detailedPage.drawText('Detailed Parameter Reports', {
    x: 50,
    y: 750,
    font,
    size: 24,
    color: rgb(0, 0.53, 0.71),
  });
  // Customizable: Add charts or tables for detailed parameter reports here

  // Table settings
  const startX = 50;
  let startY = 700;
  const rowHeight = 30;
  const columnWidths = [120, 80, 100, 250]; // Parameter, Value, Status, Details
  const fontSize = 10;
  const headingFontSize = 12;
  const textColor = rgb(0, 0, 0);
  const headerColor = rgb(0, 0.53, 0.71);

  // Draw table headers
  detailedPage.drawText('Parameter', { x: startX, y: startY, font, size: headingFontSize, color: headerColor });
  detailedPage.drawText('Value', { x: startX + columnWidths[0], y: startY, font, size: headingFontSize, color: headerColor });
  detailedPage.drawText('Status', { x: startX + columnWidths[0] + columnWidths[1], y: startY, font, size: headingFontSize, color: headerColor });
  detailedPage.drawText('Details', { x: startX + columnWidths[0] + columnWidths[1] + columnWidths[2], y: startY, font, size: headingFontSize, color: headerColor });
  startY -= rowHeight; // Move down for the first data row

  // Draw a horizontal line after headers
  detailedPage.drawLine({
    start: { x: startX, y: startY + 5 },
    end: { x: startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], y: startY + 5 },
    color: rgb(0.7, 0.7, 0.7),
    thickness: 1,
  });

  // Iterate and draw parameter data
  const parameters = [
    { name: 'pH', data: reportData.ph },
    { name: 'Temperature', data: reportData.temperature, unit: '°C' },
    { name: 'Turbidity', data: reportData.turbidity, unit: ' NTU' },
    { name: 'Salinity', data: reportData.salinity, unit: ' PSU' },
    { name: 'TDS', data: reportData.tds, unit: ' mg/L' },
  ];

  for (const param of parameters) {
    if (startY < 100) { // Simple pagination: add a new page if content goes too low
      detailedPage = pdfDoc.addPage();
      startY = 750; // Reset Y for new page
      // Redraw headers on new page
      detailedPage.drawText('Parameter', { x: startX, y: startY, font, size: headingFontSize, color: headerColor });
      detailedPage.drawText('Value', { x: startX + columnWidths[0], y: startY, font, size: headingFontSize, color: headerColor });
      detailedPage.drawText('Status', { x: startX + columnWidths[0] + columnWidths[1], y: startY, font, size: headingFontSize, color: headerColor });
      detailedPage.drawText('Details', { x: startX + columnWidths[0] + columnWidths[1] + columnWidths[2], y: startY, font, size: headingFontSize, color: headerColor });
      startY -= rowHeight; // Move down for the first data row
      detailedPage.drawLine({
        start: { x: startX, y: startY + 5 },
        end: { x: startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], y: startY + 5 },
        color: rgb(0.7, 0.7, 0.7),
        thickness: 1,
      });
    }

    detailedPage.drawText(param.name, { x: startX, y: startY, font, size: fontSize, color: textColor });
    detailedPage.drawText(`${param.data.value}${param.unit || ''}`, { x: startX + columnWidths[0], y: startY, font, size: fontSize, color: textColor });
    detailedPage.drawText(param.data.status, { x: startX + columnWidths[0] + columnWidths[1], y: startY, font, size: fontSize, color: textColor });
    
    // Handle long detail text by wrapping
    const detailsText = param.data.details;
    const detailsX = startX + columnWidths[0] + columnWidths[1] + columnWidths[2];
    const detailsMaxWidth = columnWidths[3];
    const wrappedLines = wrapText(detailsText, font, fontSize, detailsMaxWidth);
    
    let currentTextY = startY;
    for (const line of wrappedLines) {
      detailedPage.drawText(line, { x: detailsX, y: currentTextY, font, size: fontSize, color: textColor, maxWidth: detailsMaxWidth });
      currentTextY -= font.heightAtSize(fontSize) + 2; // Move down for next line
    }

    startY -= Math.max(rowHeight, (font.heightAtSize(fontSize) + 2) * wrappedLines.length + 5); // Adjust row height based on content
  }

  // Insights & Suggestions from AI
  const insightsPage = pdfDoc.addPage();
  insightsPage.drawText('Insights & Suggestions from AI', {
    x: 50,
    y: 750,
    font,
    size: 24,
    color: rgb(0, 0.53, 0.71),
  });
  // Customizable: Modify AI insights text and style
  insightsPage.drawText(reportData.aiInsights, {
    x: 50,
    y: 700,
    font,
    size: 12,
    color: rgb(0, 0, 0),
  });

  // Forecast Section
  const forecastPage = pdfDoc.addPage();
  forecastPage.drawText('Forecast Section', {
    x: 50,
    y: 750,
    font,
    size: 24,
    color: rgb(0, 0.53, 0.71),
  });
  // Customizable: Modify forecast text and style
  forecastPage.drawText(reportData.forecast, {
    x: 50,
    y: 700,
    font,
    size: 12,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.saveAsBase64();
  const pdfUri = FileSystem.cacheDirectory + 'pureflow_report.pdf';

  await FileSystem.writeAsStringAsync(pdfUri, pdfBytes, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(pdfUri);
  } else if (Print.isAvailableAsync()) {
    await Print.printAsync({
      uri: pdfUri,
    });
  } else {
    alert('Sharing and printing are not available on this device.');
  }
};

export default PdfGenerator;

// Inline styles (as per user preference: [[memory:3447950]])
// Customizable: Add or modify styles as needed for layout, colors, and fonts
const styles = StyleSheet.create({});
