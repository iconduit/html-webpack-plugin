const HtmlPlugin = require("html-webpack-plugin");
const IconduitHtmlPlugin = require("../../../src/index.js");

module.exports = {
  mode: "development",
  plugins: [
    new HtmlPlugin(),
    new IconduitHtmlPlugin({
      manifestPath: "./src/assets/site.iconduitmanifest",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(png|svg|xml)$/,
        type: "asset/resource",
      },
      {
        test: /\/browserconfig\.xml$/i,
        type: 'asset/resource',
        use: "@iconduit/browserconfig-loader",
      },
      {
        test: /\.webmanifest$/i,
        type: 'asset/resource',
        use: "@iconduit/webmanifest-loader",
      },
    ],
  },
  output: {
    assetModuleFilename: "[name].[contenthash][ext][query]",
  },
};
