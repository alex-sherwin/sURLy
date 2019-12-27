const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const baseConfig = require('./webpack.base.config');

const USE_SOURCE_MAPS = process.env.NODE_ENV !== "production";

module.exports = merge.smart(baseConfig, {
  target: 'electron-renderer',
  entry: {
    // app: ['@babel/polyfill', './src/renderer/renderer.tsx']
    app: [path.join(__dirname, 'src', 'renderer', 'renderer.tsx')],
  },
  watchOptions: {
    ignored: /node_modules/
  },
  module: {
    rules: [
      {
        test: /\.(css)$/,
        use: [

          // creates the actual CSS file chunk(s) and refers to them in HTML <head>
          MiniCssExtractPlugin.loader,

          // default CSS loader, we need to override defaults to enable source maps when appropriate
          {
            loader: "css-loader",
            options: {
              sourceMap: USE_SOURCE_MAPS,
            }
          },

          // PostCSS loader for CSS vendor prefixing and minification
          {
            loader: "postcss-loader", // why oh why has the world settled on postcss-loader
            options: {
              plugins: [
                require("autoprefixer"), // CSS vendor prefixing determined be .browserslistrc
                ...(USE_SOURCE_MAPS ? [] : [require("cssnano")]), // CSS minifier in production mode only
                // require("postcss-discard-font-face")(["woff2"]),
              ],
              sourceMap: USE_SOURCE_MAPS,
            }
          },

          // SASS language pre-processing loader, we need to override defaults to enable source maps when appropriate
          // {
          //   loader: "sass-loader",
          //   options: {
          //     sourceMap: USE_SOURCE_MAPS,
          //   }
          // },

        ],
      },

      {
        test: /\.(gif|png|jpe?g|svg)$/,
        use: [
          'file-loader',
          {
            loader: 'image-webpack-loader',
            options: {
              disable: true
            }
          }
        ]
      },

      // load all other supported asset types from separate files
      {
        test: /\.(png|cur|eot|woff|woff2|ttf|gif|jpg|jpeg)$/,
        loader: "file-loader",
        options: {
          name: "[hash].[ext]"
          // name: "[name]-[hash].[ext]"
        }
      },

      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          configFile: path.join(__dirname, "babel.config.renderer.js"),
        }
      },

      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        loader: "ts-loader",
        options: {
          happyPackMode: true // IMPORTANT! use happyPackMode mode to speed-up compilation and reduce errors reported to webpack
          // https://github.com/TypeStrong/ts-loader#allowtsinnodemodules-boolean-defaultfalse
          // allowTsInNodeModules: true, // IMPORTANT, by default .ts/.tsx sources in node_modules/ are ignored
        }
      },

      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader'
      }
    ]
  },
  plugins: [

    // counterpart to the MiniCss loader
    // override defaults to provide stable filenames based on a hash of the chunk contents (improves caching for end-users)
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[name].bundle.css",
    }),
    new MonacoWebpackPlugin({
      // publicPath: "/",
      languages: ["html", "json", "xml", "css", "javascript", "shell", "yaml", "markdown", "sql", "python"],
      // features: [

      //   // 'accessibilityHelp',
      //   // 'bracketMatching',
      //   // 'caretOperations',
      //   // 'clipboard',
      //   // 'codeAction',
      //   // 'codelens',
      //   // 'colorDetector',
      //   // 'comment',
      //   // 'contextmenu',
      //   // 'coreCommands',
      //   // 'cursorUndo',
      //   // 'dnd',
      //   // 'find',
      //   // 'folding',
      //   // 'fontZoom',
      //   // 'format',
      //   // 'gotoError',
      //   // 'gotoLine',
      //   // 'gotoSymbol',
      //   // 'hover',
      //   // 'inPlaceReplace',

      //   // 'inspectTokens',
      //   // 'iPadShowKeyboard',
      //   // 'linesOperations',
      //   // 'links',
      //   // 'multicursor',
      //   // 'parameterHints',
      //   // 'quickCommand',
      //   // 'quickOutline',
      //   // 'referenceSearch',
      //   // 'rename',

      //   // 'smartSelect',
      //   // 'snippets',
      //   // 'suggest',
      //   // 'toggleHighContrast',
      //   // 'toggleTabFocusMode',
      //   // 'transpose',
      //   // 'wordHighlighter',
      //   // 'wordOperations',
      //   // 'wordPartOperations',







      //   "clipboard",
      //   "coreCommands",
      //   "cursorUndo",
      //   "find",
      //   "inPlaceReplace",
      //   "colorDetector",
      //   "comment",
      //   "contextmenu",
      //   "folding",
      //   "format",
      //   "hover",
      //   "smartSelect",
      //   "wordHighlighter",
      //   "wordOperations",
      //   "wordPartOperations",
      //   "bracketMatching",
      //   "multicursor",


      // ],
    }),
    // Ignore require() calls in vs/language/typescript/lib/typescriptServices.js
    // new webpack.IgnorePlugin(
    //   /^((fs)|(path)|(os)|(crypto)|(source-map-support))$/,
    //   /vs(\/|\\)language(\/|\\)typescript(\/|\\)lib/
    // ),
    new ForkTsCheckerWebpackPlugin({
      checkSyntacticErrors: true,
      tsconfig: path.join(__dirname, "tsconfig.json"),
      reportFiles: ['src/renderer/**/*', 'src/shared/**/*'],
    }),

    new webpack.NamedModulesPlugin(),

    new HtmlWebpackPlugin(),

    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    })
  ]
});
