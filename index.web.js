import { AppRegistry } from 'react-native';
import { LogBox } from 'react-native';

// Suppress specific warnings for web
LogBox.ignoreLogs([
  'Invalid DOM property `transform-origin`. Did you mean `transformOrigin`?',
  'Unknown event handler property `onStartShouldSetResponder`. It will be ignored.',
  'Unknown event handler property `onResponderTerminationRequest`. It will be ignored.',
  'Unknown event handler property `onResponderGrant`. It will be ignored.',
  'Unknown event handler property `onResponderMove`. It will be ignored.',
  'Unknown event handler property `onResponderRelease`. It will be ignored.',
  'Unknown event handler property `onResponderTerminate`. It will be ignored.',
]);

// Import your main app
import App from './app/_layout';

AppRegistry.registerComponent('main', () => App);
AppRegistry.runApplication('main', {
  rootTag: document.getElementById('root') || document.getElementById('main'),
}); 