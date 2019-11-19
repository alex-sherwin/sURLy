const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const baseConfig = require('./webpack.base.config');

module.exports = merge.smart(baseConfig, {
  target: 'electron-main',
  entry: {
    main: './src/main/main.ts'
  },
  externals: {
    "node-libcurl": 'require("node-libcurl")',
    // "node-libcurl": "node-libcurl",
  },
  module: {
    rules: [
      {
        test: /\.node$/,
        use: 'node-loader',
      },
      {
        // test: /\.(m?js|node)$/,
        test: /\.node$/,
        parser: { amd: false },
        use: {
          loader: '@zeit/webpack-asset-relocator-loader',
          options: {
            outputAssetBase: 'native_modules',
          },
        },
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
          babelrc: false,
          presets: [
            [
              '@babel/preset-env',
              { targets: 'maintained node versions' }
            ],
            '@babel/preset-typescript'
          ],
          plugins: [
            ['@babel/plugin-proposal-class-properties', { loose: true }]
          ]
        }
      }
    ]
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      reportFiles: ['src/main/**/*', 'src/shared/**/*'],
      checkSyntacticErrors: true,
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    })
  ]
});
