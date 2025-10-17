// Jest setup file for React Native/Expo
import 'react-native-gesture-handler/jestSetup';

// Mock IntersectionObserver which is not available in test environment
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => {
  setTimeout(cb, 0);
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Silence warning about missing expo-constants
jest.mock('expo-constants', () => ({
  default: {
    manifest: {},
    executionEnvironment: 'bare',
  },
}));

// Mock expo modules that might cause issues
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(),
  preventAutoHideAsync: jest.fn(),
}));
