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
  // externals: [
  //   function (context, request, callback) {
  //     // console.log(context);
  //     if (/node-libcurl\/dist/.test(context) && /package\.json/.test(request)) {
  //       console.log("** HIT node-libcurl!");
  //       console.log(typeof context);
  //       console.log(typeof request);
  //       console.log(arguments);
        
  //       return callback(null, 'require("../../package22.json")');
  //     }
  //     if (/node-pre-gyp\/lib/.test(context) && /package\.json/.test(request)) {
  //       console.log("** HIT node-pre-gyp!");
  //       return callback(null, 'require("../../package22.json")');
  //     }
  //     // console.log(`ctx=${context} request=${request}`);
  //     callback();
  //   }
  // ],
  // externals: {
  // "node-libcurl": 'require("node-libcurl")',
  // "node-pre-gyp": 'require("node-pre-gyp")'
  // "node-libcurl": "node-libcurl",
  // "./package.json": 'require("FIXME")'
  // },
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
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader'
      },
    ]
  },
  plugins: [
    // new ForkTsCheckerWebpackPlugin({
    //   reportFiles: ['src/main/**/*', 'src/shared/**/*'],
    //   checkSyntacticErrors: true,
    // }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    }),
    new webpack.NormalModuleReplacementPlugin(
      /\.\/src\/main\/package\.json/,
      'FIXME.json'
    ),
  ]
});
