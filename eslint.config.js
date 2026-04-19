// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'app-example/**'],
    rules: {
      'import/no-unresolved': [
        'error',
        {
          ignore: ['^expo-image-picker$', '^@react-native-async-storage/async-storage$'],
        },
      ],
    },
  },
]);
