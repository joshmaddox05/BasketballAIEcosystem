module.exports = {
  root: true,
  extends: ['expo'],
  env: {
    browser: true,
    es2022: true,
    'react-native/react-native': true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-native'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: [
        'plugin:@typescript-eslint/recommended',
      ],
      rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    'react-native/no-unused-styles': 'warn',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'warn',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.expo/',
    'ios/',
    'android/',
  ],
};
