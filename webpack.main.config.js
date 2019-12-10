const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const baseConfig = require('./webpack.base.config');

module.exports = merge.smart(baseConfig, {
  target: 'electron-main',
  entry: {
    main: [path.join(__dirname, 'src', 'main', 'main.ts')],
  },
  output: {
    devtoolModuleFilenameTemplate: function (info) {
      // return "file:///" + info.absoluteResourcePath;
      return 'file://' + path.resolve(info.absoluteResourcePath)
    }
  },
  watchOptions: {
    ignored: /node_modules/
  },
  externals: {
    "../lib/binding/node_libcurl.node": 'require("./native_modules/lib/binding/node_libcurl.node")'
  },
  module: {
    rules: [
      // {
      //   test: /\.node$/,
      //   use: 'node-loader',
      // },
      // {
      //   test: /\.node$/,
      //   parser: { amd: false },
      //   use: {
      //     loader: '@zeit/webpack-asset-relocator-loader',
      //     options: {
      //       outputAssetBase: 'native_modules',
      //     },
      //   },
      // },

      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          configFile: path.join(__dirname, "babel.config.main.js"),
        }
      },

      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: "ts-loader",
        options: {
          happyPackMode: true // IMPORTANT! use happyPackMode mode to speed-up compilation and reduce errors reported to webpack
          // https://github.com/TypeStrong/ts-loader#allowtsinnodemodules-boolean-defaultfalse
          // allowTsInNodeModules: true, // IMPORTANT, by default .ts/.tsx sources in node_modules/ are ignored
        }
      },

    ]
  },
  plugins: [
    new CopyPlugin([{
      from: 'node_modules/@capecodes/node-libcurl/lib/binding/node_libcurl.node',
      to: 'native_modules/lib/binding/node_libcurl.node',
    }]),
    new ForkTsCheckerWebpackPlugin({
      checkSyntacticErrors: true,
      tsconfig: path.join(__dirname, "tsconfig.json"),
      reportFiles: ['src/main/**/*', 'src/shared/**/*'],
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    }),
    new webpack.NormalModuleReplacementPlugin(
      /\.\/src\/main\/package\.json/,
    ),
  ]
});
