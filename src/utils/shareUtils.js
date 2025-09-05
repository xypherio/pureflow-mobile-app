import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export const sharePdf = async ({ url, title = 'Share PDF', subject = 'Water Quality Report', message = 'Here is the water quality report' }) => {
  try {
    // Get the filename from the URL
    const fileName = url.split('/').pop();
    
    // On Android, we need to copy the file to the app's cache directory
    const cacheDir = FileSystem.cacheDirectory;
    const localUri = `${cacheDir}${fileName}`;
    
    // Ensure the cache directory exists
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    
    // Copy the file to the cache directory
    await FileSystem.downloadAsync(url, localUri);
    
    // Share the file using expo-sharing
    await Sharing.shareAsync(localUri, {
      mimeType: 'application/pdf',
      dialogTitle: title,
      UTI: 'com.adobe.pdf'
    });
    
    return true;
  } catch (error) {
    console.error('Error sharing PDF:', error);
    throw error;
  }
};
