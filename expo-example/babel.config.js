module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['@babel/plugin-transform-class-static-block', 
      [
        'babel-plugin-show-source',
        {
          directive: 'show source please', // Changed from default to avoid Hermes conflicts
        },
      ],
    ]
  };
};
