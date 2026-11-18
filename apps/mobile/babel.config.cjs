module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        alias: {
          '@core': './src/core',
          '@ui': './src/ui',
          '@pattern': './src/pattern',
          '@layouts': './src/layouts',
          '@features': './src/features',
          '@screens': './src/screens',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      }],
    ],
  };
};
