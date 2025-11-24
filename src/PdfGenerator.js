import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { StyleSheet } from 'react-native';
import { sanitizeTextForPDF } from './utils/exportUtils';

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

  // --- Section 0: Report Header ---
  page.drawText('PureFlow Water Quality Report', {
    x: startX,
    y: startY,
    font: fontBold,
    size: sectionTitleFontSize,
    color: headerColor,
  });
  startY -= rowHeight;

  page.drawText(sanitizeTextForPDF(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`), {
    x: startX,
    y: startY,
    font,
    size: fontSize,
    color: textColor,
  });
  startY -= rowHeight * 0.8;

  page.drawText(sanitizeTextForPDF(`Time Period: ${reportData.metadata?.timePeriod || 'N/A'}`), {
    x: startX,
    y: startY,
    font,
    size: fontSize,
    color: textColor,
  });
  startY -= rowHeight * 0.8;

  page.drawText(sanitizeTextForPDF(`Water Quality Index: ${reportData.metadata?.wqi?.value || 0}/100 (${reportData.metadata?.wqi?.status || 'unknown'})`), {
    x: startX,
    y: startY,
    font,
    size: fontSize,
    color: textColor,
  });
  startY -= rowHeight;

  drawSectionDivider();
  startY -= rowHeight * 0.7;

  // --- Section 1: Executive Summary ---
  page.drawText('Executive Summary', {
    x: startX,
    y: startY,
    font: fontBold,
    size: sectionTitleFontSize,
    color: headerColor,
  });
  startY -= rowHeight * 1.2;

  if (reportData.executiveSummary) {
    const sanitizedSummary = sanitizeTextForPDF(reportData.executiveSummary);
    const summaryWrapped = wrapText(sanitizedSummary, font, fontSize, 500);
    for (const line of summaryWrapped) {
      page.drawText(sanitizeTextForPDF(line), { x: startX, y: startY, font, size: fontSize, color: textColor });
      startY -= font.heightAtSize(fontSize) + 2;
      checkPageSpace();
    }
  } else {
    page.drawText('Executive summary not available.', { x: startX, y: startY, font, size: fontSize, color: textColor });
    startY -= rowHeight;
  }

  startY -= rowHeight * 0.5;
  drawSectionDivider();
  startY -= rowHeight * 0.7;

  // --- Section 2: Environmental & Weather Context ---
  page.drawText('Environmental Context', {
    x: startX,
    y: startY,
    font: fontBold,
    size: sectionTitleFontSize,
    color: headerColor,
  });
  startY -= rowHeight * 1.2;

  if (reportData.environmental?.weather) {
    page.drawText(`Weather Conditions: ${sanitizeTextForPDF(reportData.environmental.weather.description)}`, {
      x: startX,
      y: startY,
      font,
      size: fontSize,
      color: textColor,
    });
    startY -= rowHeight * 0.8;

    if (reportData.environmental.weather.humidity && reportData.environmental.weather.windSpeed) {
      page.drawText(`Humidity: ${reportData.environmental.weather.humidity}%, Wind: ${reportData.environmental.weather.windSpeed} m/s`, {
        x: startX,
        y: startY,
        font,
        size: fontSize,
        color: textColor,
      });
      startY -= rowHeight;
    }
  } else {
    page.drawText('Weather data not available during report generation.', {
      x: startX,
      y: startY,
      font,
      size: fontSize,
      color: textColor,
    });
    startY -= rowHeight;
  }

  startY -= rowHeight * 0.5;
  drawSectionDivider();
  startY -= rowHeight * 0.7;

  // --- Section 3: Regulatory Compliance Dashboard ---
  checkPageSpace(rowHeight * 2);
  page.drawText('Regulatory Compliance Dashboard', {
    x: startX,
    y: startY,
    font: fontBold,
    size: sectionTitleFontSize,
    color: headerColor,
  });
  startY -= rowHeight * 1.2;

  if (reportData.compliance) {
    const compliance = reportData.compliance;

    page.drawText(sanitizeTextForPDF(`Overall Compliance: ${compliance.overallCompliance}% (${compliance.compliantParameters}/${compliance.totalParameters} parameters compliant)`), {
      x: startX,
      y: startY,
      font: fontBold,
      size: fontSize,
      color: textColor,
    });
    startY -= rowHeight;

    if (compliance.criticalIssues > 0) {
      page.drawText(sanitizeTextForPDF(`Critical Issues: ${compliance.criticalIssues}`), {
        x: startX,
        y: startY,
        font,
        size: fontSize,
        color: rgb(1, 0, 0), // Red for critical
      });
      startY -= rowHeight * 0.8;
    }

    if (compliance.warningIssues > 0) {
      page.drawText(sanitizeTextForPDF(`Warning Issues: ${compliance.warningIssues}`), {
        x: startX,
        y: startY,
        font,
        size: fontSize,
        color: rgb(1, 0.65, 0), // Orange for warning
      });
      startY -= rowHeight;
    }
  } else {
    page.drawText('Compliance data not available.', {
      x: startX,
      y: startY,
      font,
      size: fontSize,
      color: textColor,
    });
    startY -= rowHeight;
  }

  startY -= rowHeight * 0.5;
  drawSectionDivider();
  startY -= rowHeight * 0.7;

  // --- Section 4: Overall Water Quality Report ---
  checkPageSpace(rowHeight * 2);
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

  // Extract parameters from nested structure (from prepareExportData)
  // Support both nested structure (new) and flat structure (legacy)
  const parametersData = reportData.parameters || {};
  const parameters = [
    { name: 'pH', data: parametersData.ph || reportData.ph, unit: '' },
    { name: 'Temperature', data: parametersData.temperature || reportData.temperature, unit: '°C' },
    { name: 'Turbidity', data: parametersData.turbidity || reportData.turbidity, unit: ' NTU' },
    { name: 'Salinity', data: parametersData.salinity || reportData.salinity, unit: ' PSU' },
  ];

  for (const param of parameters) {
    checkPageSpace();
    // Handle both nested structure and flat structure
    let average = 0;
    let averageDisplay = '0';
    if (param.data) {
      if (typeof param.data.average === 'number' && Number.isFinite(param.data.average)) {
        average = param.data.average;
        averageDisplay = average.toFixed(2);
      } else if (typeof param.data.value === 'string' && param.data.value !== 'N/A') {
        const parsed = parseFloat(param.data.value);
        if (!isNaN(parsed)) {
          average = parsed;
          averageDisplay = average.toFixed(2);
        } else {
          averageDisplay = 'N/A';
        }
      } else if (param.data.value === 'N/A' || param.data.status === 'unknown') {
        averageDisplay = 'N/A';
      }
    } else {
      averageDisplay = 'N/A';
    }
    
    const status = param.data && param.data.status ? param.data.status : 'unknown';
    const detailsText = sanitizeTextForPDF(param.data && param.data.details ? param.data.details :
                        (param.data && param.data.trend && param.data.trend.message ? param.data.trend.message : 'No details available'));

    page.drawText(param.name, { x: startX, y: startY, font, size: fontSize, color: textColor });
    page.drawText(`${averageDisplay}${param.unit}`, { x: startX + columnWidths[0], y: startY, font, size: fontSize, color: textColor });
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

    // Values for the parameter - handle both nested and flat structures
    // Helper to safely get numeric value or return null
    const getNumericValue = (val, fallback = null) => {
      if (typeof val === 'number' && Number.isFinite(val)) return val;
      if (typeof val === 'string' && val !== 'N/A') {
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) return parsed;
      }
      return fallback;
    };
    
    const avgValue = getNumericValue(param.data?.average, null);
    const currentValue = getNumericValue(param.data?.value, avgValue);
    const minValue = getNumericValue(param.data?.min, null);
    const maxValue = getNumericValue(param.data?.max, null);
    const statusValue = param.data?.status || 'unknown';
    const detailsValue = sanitizeTextForPDF(param.data?.details ||
                         (param.data?.trend && param.data.trend.message ? param.data.trend.message : 'No details available'));

    // Format values for display - show "N/A" if null/undefined
    const formatValue = (val) => val !== null && val !== undefined ? val.toFixed(2) : 'N/A';

    // Get AI insights for this parameter from recommendations
    const insightsData = reportData.insights || {};
    const recommendations = insightsData.recommendations || [];
    const paramInsight = recommendations.find(rec =>
      rec.parameter && rec.parameter.toLowerCase() === param.name.toLowerCase()
    );
    const aiInsightText = paramInsight ? sanitizeTextForPDF(paramInsight.recommendation || paramInsight.details || 'No AI insights') : 'No AI insights available';
    
    const values = [
      { label: 'Average', value: formatValue(avgValue), unit: param.unit, details: '' },
      { label: 'Current', value: formatValue(currentValue), unit: param.unit, details: '' },
      { label: 'Min', value: formatValue(minValue), unit: param.unit, details: '' },
      { label: 'Max', value: formatValue(maxValue), unit: param.unit, details: '' },
      { label: 'Status', value: statusValue, unit: '', details: '' },
      { label: 'Details', value: '', unit: '', details: detailsValue },
      { label: 'AI Insights', value: '', unit: '', details: aiInsightText },
    ];

    for (const v of values) {
      checkPageSpace(rowHeight);
      page.drawText(v.label, { x: startX, y: startY, font, size: fontSize, color: textColor });
      // v.value is already formatted as string (either number with .toFixed(2) or "N/A")
      page.drawText(String(v.value), { x: startX + detailColWidths[0], y: startY, font, size: fontSize, color: textColor });
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

  // --- Section 5: Sampling Information ---
  if (reportData.samplingInfo) {
    page.drawText('Sampling Information', {
      x: startX,
      y: startY,
      font: fontBold,
      size: sectionTitleFontSize,
      color: headerColor,
    });
    startY -= rowHeight * 1.2;

    const sampling = reportData.samplingInfo;
    page.drawText(sanitizeTextForPDF(`Time Period: ${sampling.timePeriod}`), {
      x: startX,
      y: startY,
      font,
      size: fontSize,
      color: textColor,
    });
    startY -= rowHeight * 0.8;

    page.drawText(sanitizeTextForPDF(`Data Points: ${sampling.dataPoints}`), {
      x: startX,
      y: startY,
      font,
      size: fontSize,
      color: textColor,
    });
    startY -= rowHeight * 0.8;

    page.drawText(sanitizeTextForPDF(`Location: ${sampling.location}`), {
      x: startX,
      y: startY,
      font,
      size: fontSize,
      color: textColor,
    });
    startY -= rowHeight * 0.8;

    page.drawText(sanitizeTextForPDF(`Reporting Date: ${sampling.reportingDate}`), {
      x: startX,
      y: startY,
      font,
      size: fontSize,
      color: textColor,
    });
    startY -= rowHeight * 0.8;

    page.drawText(sanitizeTextForPDF(`System Version: ${sampling.systemVersion}`), {
      x: startX,
      y: startY,
      font,
      size: fontSize,
      color: textColor,
    });
    startY -= rowHeight * 0.8;

    page.drawText(sanitizeTextForPDF(`Sampling Method: ${sampling.samplingMethod}`), {
      x: startX,
      y: startY,
      font,
      size: fontSize,
      color: textColor,
    });
    startY -= rowHeight;
  }

  startY -= rowHeight * 0.5;
  drawSectionDivider();
  startY -= rowHeight * 0.7;
  checkPageSpace(rowHeight * 4);

  // --- Section 6: Action Priority Matrix ---
  page.drawText('Action Priority Matrix', {
    x: startX,
    y: startY,
    font: fontBold,
    size: sectionTitleFontSize,
    color: headerColor,
  });
  startY -= rowHeight * 1.2;

  if (reportData.insights?.priorityMatrix) {
    const matrix = reportData.insights.priorityMatrix;

    // Critical Priority
  if (matrix.critical && matrix.critical.length > 0) {
    page.drawText('CRITICAL (Immediate Action Required):', {
      x: startX,
      y: startY,
      font: fontBold,
      size: fontSize,
      color: rgb(1, 0, 0),
    });
    startY -= rowHeight * 0.8;

    matrix.critical.forEach((item, index) => {
      checkPageSpace(rowHeight * 2);
      const itemText = `${item.id}. ${sanitizeTextForPDF(item.text)} (${item.parameter})`;
      const wrappedItem = wrapText(itemText, font, fontSize, 480);
      for (const line of wrappedItem) {
        page.drawText(sanitizeTextForPDF(line), { x: startX + 20, y: startY, font, size: fontSize, color: textColor });
        startY -= font.heightAtSize(fontSize) + 2;
        checkPageSpace();
      }
    });
    startY -= rowHeight * 0.5;
  }

  // High Priority
  if (matrix.high && matrix.high.length > 0) {
    page.drawText('HIGH (Important - Requires Attention):', {
      x: startX,
      y: startY,
      font: fontBold,
      size: fontSize,
      color: rgb(1, 0.65, 0),
    });
    startY -= rowHeight * 0.8;

    matrix.high.forEach((item) => {
      checkPageSpace(rowHeight * 2);
      const itemText = `${item.id}. ${sanitizeTextForPDF(item.text)} (${item.parameter})`;
      const wrappedItem = wrapText(itemText, font, fontSize, 480);
      for (const line of wrappedItem) {
        page.drawText(sanitizeTextForPDF(line), { x: startX + 20, y: startY, font, size: fontSize, color: textColor });
        startY -= font.heightAtSize(fontSize) + 2;
        checkPageSpace();
      }
    });
    startY -= rowHeight * 0.5;
  }

  // Medium Priority
  if (matrix.medium && matrix.medium.length > 0) {
    page.drawText('MEDIUM (Monitor and Address if Possible):', {
      x: startX,
      y: startY,
      font: fontBold,
      size: fontSize,
      color: rgb(0, 0.5, 1),
    });
    startY -= rowHeight * 0.8;

    matrix.medium.forEach((item) => {
      checkPageSpace(rowHeight * 2);
      const itemText = `${item.id}. ${sanitizeTextForPDF(item.text)} (${item.parameter})`;
      const wrappedItem = wrapText(itemText, font, fontSize, 480);
      for (const line of wrappedItem) {
        page.drawText(sanitizeTextForPDF(line), { x: startX + 20, y: startY, font, size: fontSize, color: textColor });
        startY -= font.heightAtSize(fontSize) + 2;
        checkPageSpace();
      }
    });
    startY -= rowHeight * 0.5;
  }

  // Low Priority
  if (matrix.low && matrix.low.length > 0) {
    page.drawText('LOW (Optional/General Suggestions):', {
      x: startX,
      y: startY,
      font: fontBold,
      size: fontSize,
      color: rgb(0.3, 0.7, 0.3),
    });
    startY -= rowHeight * 0.8;

    matrix.low.forEach((item) => {
      checkPageSpace(rowHeight * 2);
      const itemText = `${item.id}. ${sanitizeTextForPDF(item.text)} (${item.parameter})`;
      const wrappedItem = wrapText(itemText, font, fontSize, 480);
      for (const line of wrappedItem) {
        page.drawText(sanitizeTextForPDF(line), { x: startX + 20, y: startY, font, size: fontSize, color: textColor });
        startY -= font.heightAtSize(fontSize) + 2;
        checkPageSpace();
      }
    });
    startY -= rowHeight * 0.5;
  }
  } else {
    page.drawText('No prioritized recommendations available.', {
      x: startX,
      y: startY,
      font,
      size: fontSize,
      color: textColor,
    });
    startY -= rowHeight;
  }

  startY -= rowHeight * 0.5;
  drawSectionDivider();
  startY -= rowHeight * 0.7;
  checkPageSpace(rowHeight * 4);

  // --- Section 7: Overall Insights & Recommendations + Forecast ---
  page.drawText('Overall Insights & Recommendations', {
    x: startX,
    y: startY,
    font: fontBold,
    size: sectionTitleFontSize,
    color: headerColor,
  });
  startY -= rowHeight * 1.5; // Increased spacing after section title

  // Extract insights from nested structure (from prepareExportData)
  // Support both nested structure (new) and flat structure (legacy)
  const insightsData = reportData.insights || {};
  const overallInsights = insightsData.overall || reportData.aiInsights || 'No AI insights available';
  const wrappedInsights = wrapText(overallInsights, font, fontSize, 500);
  for (const line of wrappedInsights) {
    page.drawText(sanitizeTextForPDF(line), { x: startX, y: startY, font, size: fontSize, color: textColor });
    startY -= font.heightAtSize(fontSize) + 2;
    checkPageSpace();
  }

  // Add recommendations if available
  const recommendations = insightsData.recommendations || [];
  if (recommendations.length > 0) {
    startY -= rowHeight * 0.5;
    checkPageSpace(rowHeight * 2);

    page.drawText('Recommendations:', {
      x: startX,
      y: startY,
      font: fontBold,
      size: headingFontSize,
      color: headerColor,
    });
    startY -= rowHeight * 0.8;

    recommendations.forEach((rec, index) => {
      checkPageSpace(rowHeight * 2);
      const recText = `${index + 1}. ${sanitizeTextForPDF(rec.recommendation || rec.details || 'No recommendation')}`;
      const wrappedRec = wrapText(recText, font, fontSize, 500);
      for (const line of wrappedRec) {
        page.drawText(sanitizeTextForPDF(line), { x: startX + 20, y: startY, font, size: fontSize, color: textColor });
        startY -= font.heightAtSize(fontSize) + 2;
        checkPageSpace();
      }
      startY -= rowHeight * 0.3;
    });
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
