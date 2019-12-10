'use strict';

const path = require('path');

const USE_SOURCE_MAPS = process.env.NODE_ENV !== "production";

module.exports = {
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    pathinfo: false,
  },
  node: {
    __dirname: false,
    __filename: false
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json', '.node']
  },
  // devtool: USE_SOURCE_MAPS ? 'source-map' : undefined,
  devtool: USE_SOURCE_MAPS ? 'eval-source-map' : undefined,
  plugins: [
  ]
};
