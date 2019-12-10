const path = require("path");

// see https://babeljs.io/docs/en/config-files#config-function-api for docs on Babel config function API
// see https://babeljs.io/docs/en/options for the options allowed (this is the shape of the JavaScript object returned from the config function)

module.exports = (api) => {

  // cache Babel config object based on processes NODE_ENV env var value
  api.cache.using(() => process.env.NODE_ENV);

  const config = {
    plugins: [
      "@babel/proposal-object-rest-spread", // support object spread syntax (see https://babeljs.io/docs/en/babel-plugin-proposal-object-rest-spread)
      [
        "@babel/plugin-proposal-class-properties",
        { loose: true }
      ],
      "@babel/plugin-proposal-nullish-coalescing-operator",
    ],
    presets: [
      [
        "@babel/preset-env", // auto detect many things
        {
          "targets": {
            "node": "12.8",
          }
        }
      ],
      "@babel/preset-typescript", // adds support for TypeScript syntax to Babel
    ]
  };

  return config;
};