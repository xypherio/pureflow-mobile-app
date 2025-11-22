/**
 * Main entry point for the PureFlow Mobile App.
 * Registers the root component and exports global styles.
 */
import { registerRootComponent } from 'expo';
import App from './App';

// Export global styles for use throughout the app
export { default as globalStyles } from './globalStyles';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It ensures proper setup in both Expo Go and native builds
registerRootComponent(App);
