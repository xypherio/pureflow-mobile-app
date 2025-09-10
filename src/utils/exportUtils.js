import { Platform } from 'react-native';

let generateReport;
let shareFiles;

if (Platform.OS === 'web') {
  // Import web-specific implementations
  const webExports = require('./exportUtils.web');
  generateReport = webExports.generateReport;
  shareFiles = webExports.shareFiles;
} else {
  // Native-specific implementations are removed.
  // Stubs are provided to prevent errors if these functions are accidentally called on native.

  generateReport = async () => {
    console.warn('PDF generation is not supported on native platforms.');
    throw new Error('PDF generation is not available on native platforms.');
  };

  shareFiles = async () => {
    console.warn('File sharing is not supported on native platforms.');
    throw new Error('File sharing is not available on native platforms.');
  };
}

// The createHtmlContent function is removed as it was only used by native PDF generation.

export { generateReport, shareFiles };
