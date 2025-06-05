/* eslint-env node */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'babel-plugin-show-source',
      {
        directive: 'show source please', // Changed from default to avoid Hermes conflicts
      },
    ],
  ],
};
