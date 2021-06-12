const HtmlPlugin = require('html-webpack-plugin')
const IconduitHtmlPlugin = require('../../../src/index.js')

module.exports = {
  mode: 'development',
  plugins: [
    new HtmlPlugin(),
    new IconduitHtmlPlugin({manifestPath: './src/assets/site.iconduitmanifest'}),
  ],
  module: {
    rules: [
      {
        test: /\.(png|svg|xml|webmanifest)$/,
        type: 'asset/resource',
      },
    ],
  },
  output: {
    assetModuleFilename: '[name].[contenthash][ext][query]',
  },
}
