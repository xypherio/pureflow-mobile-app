import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { StyleSheet } from 'react-native';

const PdfGenerator = async (reportData) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Helper function to wrap text
  const wrapText = (text, font, fontSize, maxWidth) => {
    if (!text) return [];
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

  // Table and layout settings
  const startX = 50;
  let startY = 780;
  const rowHeight = 24;
  const fontSize = 12;
  const headingFontSize = 14;
  const sectionTitleFontSize = 16;
  const textColor = rgb(0, 0, 0);
  const headerColor = rgb(0, 0.53, 0.71);

  let page = pdfDoc.addPage();

  // Helper for pagination
  const checkPageSpace = (neededSpace = rowHeight) => {
    if (startY < 60 + neededSpace) {
      page = pdfDoc.addPage();
      startY = 780;
    }
  };

  // Draw section divider
  const drawSectionDivider = () => {
    page.drawLine({
      start: { x: startX, y: startY + 10 },
      end: { x: startX + 530, y: startY + 10 },
      color: rgb(0.8, 0.8, 0.8),
      thickness: 1,
    });
    startY -= 8;
  };

  // --- Section 1: Overall Water Quality Report ---
  page.drawText('Overall Water Quality Report', {
    x: startX,
    y: startY,
    font: fontBold,
    size: sectionTitleFontSize,
    color: headerColor,
  });
  startY -= rowHeight * 1.5; // Increased spacing after section title

  // Table headers
  const columnWidths = [120, 80, 100, 230]; // Parameter, Average, Status, Details
  page.drawText('Parameter', { x: startX, y: startY, font: fontBold, size: headingFontSize, color: headerColor });
  page.drawText('Average', { x: startX + columnWidths[0], y: startY, font: fontBold, size: headingFontSize, color: headerColor });
  page.drawText('Status', { x: startX + columnWidths[0] + columnWidths[1], y: startY, font: fontBold, size: headingFontSize, color: headerColor });
  page.drawText('Details', { x: startX + columnWidths[0] + columnWidths[1] + columnWidths[2], y: startY, font: fontBold, size: headingFontSize, color: headerColor });
  startY -= rowHeight * 0.7; // More space between header and line

  // Draw a horizontal line after headers
  page.drawLine({
    start: { x: startX, y: startY + 8 }, // Move line further down
    end: { x: startX + columnWidths.reduce((a, b) => a + b, 0), y: startY + 8 },
    color: rgb(0.7, 0.7, 0.7),
    thickness: 1,
  });
  startY -= rowHeight * 0.5; // More space between line and first row

  // Parameters for table
  const parameters = [
    { name: 'pH', data: reportData.ph, unit: '' },
    { name: 'Temperature', data: reportData.temperature, unit: '°C' },
    { name: 'Turbidity', data: reportData.turbidity, unit: ' NTU' },
    { name: 'Salinity', data: reportData.salinity, unit: ' PSU' },
  ];

  for (const param of parameters) {
    checkPageSpace();
    const average = param.data && param.data.average !== undefined ? param.data.average : 0;
    const status = param.data && param.data.status ? param.data.status : '0';
    const detailsText = param.data && param.data.details ? param.data.details : '0';

    page.drawText(param.name, { x: startX, y: startY, font, size: fontSize, color: textColor });
    page.drawText(`${average}${param.unit}`, { x: startX + columnWidths[0], y: startY, font, size: fontSize, color: textColor });
    page.drawText(status, { x: startX + columnWidths[0] + columnWidths[1], y: startY, font, size: fontSize, color: textColor });

    // Wrap details
    const detailsX = startX + columnWidths[0] + columnWidths[1] + columnWidths[2];
    const detailsMaxWidth = columnWidths[3];
    const wrappedLines = wrapText(detailsText, font, fontSize, detailsMaxWidth);

    let currentTextY = startY;
    for (const line of wrappedLines) {
      page.drawText(line, { x: detailsX, y: currentTextY, font, size: fontSize, color: textColor });
      currentTextY -= font.heightAtSize(fontSize) + 2;
    }
    startY -= Math.max(rowHeight, (font.heightAtSize(fontSize) + 2) * wrappedLines.length + 5);
  }

  startY -= rowHeight * 0.7; // More space after table
  drawSectionDivider();
  startY -= rowHeight * 0.7; // More space after divider
  checkPageSpace(rowHeight * 2);

  // --- Section 2: Detailed Report for Each Parameter (as tables) ---
  page.drawText('Detailed Report for Each Parameter', {
    x: startX,
    y: startY,
    font: fontBold,
    size: sectionTitleFontSize,
    color: headerColor,
  });
  startY -= rowHeight * 1.5; // Increased spacing after section title

  // Table columns for details: Label, Value, Unit
  const detailColWidths = [120, 100, 60, 260]; // Label, Value, Unit, Details/AI Insights

  for (const param of parameters) {
    checkPageSpace(rowHeight * 4);

    // Parameter Title
    page.drawText(param.name, {
      x: startX,
      y: startY,
      font: fontBold,
      size: headingFontSize,
      color: headerColor,
    });
    startY -= rowHeight * 0.8;

    // Table header for parameter details
    page.drawText('Label', { x: startX, y: startY, font: fontBold, size: fontSize, color: headerColor });
    page.drawText('Value', { x: startX + detailColWidths[0], y: startY, font: fontBold, size: fontSize, color: headerColor });
    page.drawText('Unit', { x: startX + detailColWidths[0] + detailColWidths[1], y: startY, font: fontBold, size: fontSize, color: headerColor });
    page.drawText('Details / AI Insights', { x: startX + detailColWidths[0] + detailColWidths[1] + detailColWidths[2], y: startY, font: fontBold, size: fontSize, color: headerColor });
    startY -= rowHeight * 0.7; // More space between header and line

    // Draw a horizontal line after headers
    page.drawLine({
      start: { x: startX, y: startY + 8 }, // Move line further down
      end: { x: startX + detailColWidths.reduce((a, b) => a + b, 0), y: startY + 8 },
      color: rgb(0.7, 0.7, 0.7),
      thickness: 1,
    });
    startY -= rowHeight * 0.5; // More space between line and first row

    // Values for the parameter
    const values = [
      { label: 'Average', value: param.data?.average ?? 0, unit: param.unit, details: '' },
      { label: 'Current', value: param.data?.value ?? 0, unit: param.unit, details: '' },
      { label: 'Min', value: param.data?.min ?? 0, unit: param.unit, details: '' },
      { label: 'Max', value: param.data?.max ?? 0, unit: param.unit, details: '' },
      { label: 'Status', value: param.data?.status ?? '0', unit: '', details: '' },
      { label: 'Details', value: '', unit: '', details: param.data?.details ?? '0' },
      { label: 'AI Insights', value: '', unit: '', details: param.data?.aiInsights ?? '0' },
    ];

    for (const v of values) {
      checkPageSpace(rowHeight);
      page.drawText(v.label, { x: startX, y: startY, font, size: fontSize, color: textColor });
      page.drawText(`${v.value}`, { x: startX + detailColWidths[0], y: startY, font, size: fontSize, color: textColor });
      page.drawText(v.unit, { x: startX + detailColWidths[0] + detailColWidths[1], y: startY, font, size: fontSize, color: textColor });

      // Wrap details/insights if present
      const detailsText = v.details || '';
      const detailsX = startX + detailColWidths[0] + detailColWidths[1] + detailColWidths[2];
      const detailsMaxWidth = detailColWidths[3];
      const wrappedLines = wrapText(detailsText, font, fontSize, detailsMaxWidth);

      let currentTextY = startY;
      for (const line of wrappedLines) {
        page.drawText(line, { x: detailsX, y: currentTextY, font, size: fontSize, color: textColor });
        currentTextY -= font.heightAtSize(fontSize) + 2;
      }
      startY -= Math.max(rowHeight, (font.heightAtSize(fontSize) + 2) * wrappedLines.length + 5);
    }

    // Draw a subtle line between parameters
    page.drawLine({
      start: { x: startX + 10, y: startY + 8 },
      end: { x: startX + 500, y: startY + 8 },
      color: rgb(0.9, 0.9, 0.9),
      thickness: 0.7,
    });
    startY -= rowHeight * 0.7; // More space after each parameter
    checkPageSpace();
  }

  drawSectionDivider();
  startY -= rowHeight * 0.7; // More space after divider
  checkPageSpace(rowHeight * 4);

  // --- Section 3: Overall Insights & Recommendations + Forecast ---
  page.drawText('Overall Insights & Recommendations', {
    x: startX,
    y: startY,
    font: fontBold,
    size: sectionTitleFontSize,
    color: headerColor,
  });
  startY -= rowHeight * 1.5; // Increased spacing after section title

  const overallInsights = reportData.aiInsights ?? '0';
  const wrappedInsights = wrapText(overallInsights, font, fontSize, 500);
  for (const line of wrappedInsights) {
    page.drawText(line, { x: startX, y: startY, font, size: fontSize, color: textColor });
    startY -= font.heightAtSize(fontSize) + 2;
    checkPageSpace();
  }

  startY -= rowHeight * 0.5;
  checkPageSpace(rowHeight * 2);

  page.drawText('Forecast', {
    x: startX,
    y: startY,
    font: fontBold,
    size: headingFontSize,
    color: headerColor,
  });
  startY -= rowHeight * 1.2; // More space after forecast title

  const forecast = reportData.forecast ?? '0';
  const wrappedForecast = wrapText(forecast, font, fontSize, 500);
  for (const line of wrappedForecast) {
    page.drawText(line, { x: startX, y: startY, font, size: fontSize, color: textColor });
    startY -= font.heightAtSize(fontSize) + 2;
    checkPageSpace();
  }

  // Save and share/print
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

// Inline styles (as per user preference)
const styles = StyleSheet.create({});
