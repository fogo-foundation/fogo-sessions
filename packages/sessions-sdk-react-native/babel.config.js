module.exports = {
  overrides: [
    {
      exclude: /\/node_modules\//,
      presets: ['module:react-native-builder-bob/babel-preset'],
    },
    {
      include: /\/node_modules\//,
      presets: ['module:@react-native/babel-preset'],
    },
  ],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          fs: false,
          crypto: 'crypto-browserify',
          buffer: 'buffer',
          stream: 'readable-stream',
        },
      },
    ],
  ],
};
