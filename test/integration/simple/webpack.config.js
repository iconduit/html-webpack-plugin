const HtmlPlugin = require("html-webpack-plugin");
const { join } = require("path");
const IconduitHtmlPlugin = require("../../../src/index.js");

module.exports = {
  mode: "development",
  context: __dirname,
  plugins: [
    new HtmlPlugin(),
    new IconduitHtmlPlugin({
      manifestPath: "./src/assets/app.iconduitmanifest",
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
        generator: {
          filename: "[name][ext]",
        }
      },
      {
        test: /\.webmanifest$/i,
        type: 'asset/resource',
        use: "@iconduit/webmanifest-loader",
        generator: {
          filename: "[name][ext]",
        }
      },
    ],
  },
  output: {
    assetModuleFilename: "[name].[contenthash][ext][query]",
    path: join(__dirname, "dist"),
  },
};
