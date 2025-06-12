module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-class-static-block',
      [
        'babel-plugin-show-source', // plugin allow to keep function body definition as string with Hermes
        {
          directive: 'replicatorFilter', // Changed from default to avoid Hermes conflicts
        },
      ],
    ],
  };
};
