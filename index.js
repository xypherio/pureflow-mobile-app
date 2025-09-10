import { registerRootComponent } from 'expo';
import App from './App';

export * from "./globalStyles";
export { default as globalStyles } from "./globalStyles";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
