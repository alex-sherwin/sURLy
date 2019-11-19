const path = require("path");

// see https://babeljs.io/docs/en/config-files#config-function-api for docs on Babel config function API
// see https://babeljs.io/docs/en/options for the options allowed (this is the shape of the JavaScript object returned from the config function)
module.exports = (api) => {

  // cache Babel config object based on processes NODE_ENV env var value
  api.cache.using(() => process.env.NODE_ENV);

  // you should probably *NOT* try to use exclude, include or ignore in the returned config object
  //
  // you may be wondering "why not?", and the answer is simple.  the semantics are less feature rich than 
  // letting the babel-loader config in webpack decide on file filtering.  also, webpack is already doing
  // some level of file filtering, so configuring anything here is creating a not-obvious union of file
  // inclusion logic between to disparate configuration files.
  //
  // short version: don't do it here, do it in webpack.config.js on babel-loader

  const config = {
    plugins: [
      "@babel/proposal-object-rest-spread", // support object spread syntax (see https://babeljs.io/docs/en/babel-plugin-proposal-object-rest-spread)
      // support styled-components babel processing (see https://www.styled-components.com/docs/tooling#babel-plugin)
      [
        "babel-plugin-styled-components",
        {
          "displayName": true
        }
      ],
      [
        "@babel/plugin-proposal-class-properties",
        { loose: true }
      ]
    ],
    presets: [
      [
        "@babel/preset-env", // auto detect many things
        {
          configPath: path.join(__dirname, ".browserslistrc"),
        }
      ],
      "@babel/preset-react", // adds support for JSX/TSX to Babel
      "@babel/preset-typescript", // adds support for TypeScript syntax to Babel
    ]
  };

  return config;
};