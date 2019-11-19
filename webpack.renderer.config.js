const webpack = require('webpack');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const baseConfig = require('./webpack.base.config');

const USE_SOURCE_MAPS = true;

module.exports = merge.smart(baseConfig, {
  target: 'electron-renderer',
  entry: {
    app: ['@babel/polyfill', './src/renderer/renderer.tsx']
  },
  watchOptions: {
    ignored: /node_modules/
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: [
          {
            loader: "cache-loader"
          },
          {
            loader: 'babel-loader',
            options:  {
              cacheDirectory: true,
              cacheCompression: false,
            }
          },
          {
            loader: "ts-loader",
            options: {
              happyPackMode: true // IMPORTANT! use happyPackMode mode to speed-up compilation and reduce errors reported to webpack
              // https://github.com/TypeStrong/ts-loader#allowtsinnodemodules-boolean-defaultfalse
              // allowTsInNodeModules: true, // IMPORTANT, by default .ts/.tsx sources in node_modules/ are ignored
            }
          },
        ],
      },
      {
        test: /\.(css|scss)$/,
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
                // ...(IS_PRODUCTION ? [require("cssnano")] : []), // CSS minifier in production mode only
              ],
              sourceMap: USE_SOURCE_MAPS,
            }
          },

          // SASS language pre-processing loader, we need to override defaults to enable source maps when appropriate
          {
            loader: "sass-loader",
            options: {
              sourceMap: USE_SOURCE_MAPS,
            }
          },

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
          name: "[name]-[hash].[ext]"
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
      filename: "[name].[chunkhash].css",
      chunkFilename: "[name].[chunkhash].bundle.css",
    }),
    new MonacoWebpackPlugin({
      languages: ["html", "json", "xml"],
      features: ["clipboard", "coreCommands", "cursorUndo", "find", "inPlaceReplace"],

    }),
    // Ignore require() calls in vs/language/typescript/lib/typescriptServices.js
    new webpack.IgnorePlugin(
      /^((fs)|(path)|(os)|(crypto)|(source-map-support))$/,
      /vs(\/|\\)language(\/|\\)typescript(\/|\\)lib/
    ),
    new ForkTsCheckerWebpackPlugin({
      reportFiles: ['src/renderer/**/*', 'src/shared/**/*'],
      checkSyntacticErrors: true,
    }),
    new webpack.NamedModulesPlugin(),
    new HtmlWebpackPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    })
  ]
});
