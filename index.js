/**
 * Main entry point for the PureFlow Mobile App.
 * Registers the root component and exports global styles.
 */
import { registerRootComponent } from 'expo';
import App from './App';

// Export global styles for use throughout the app
export { default as globalStyles } from './globalStyles';

// Set up background message handler for FCM (must be done before registering the app)
// This handles messages when the app is terminated/backgrounded
// Note: Background message handler is set during FCM service initialization
// This import ensures FCM is available at app startup
import './src/services/firebase/fcmService';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It ensures proper setup in both Expo Go and native builds
registerRootComponent(App);
