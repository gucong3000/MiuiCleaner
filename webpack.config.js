// Generated using webpack-cli https://github.com/webpack/webpack-cli
// http://auto.moly.host/index.html#/template/template
const path = require("path");
let bubleCfgRhino = require("buble-config-rhino");
bubleCfgRhino = bubleCfgRhino.default || bubleCfgRhino;
const AutojsDeployPlugin = require("./autojs-deploy");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const babelConfig = require("./babel.config");
const webpack = require("webpack");

const config = {
	entry: {
		main: "./src/miui_cleaner_app/index.js",
	},
	output: {
		path: path.resolve(__dirname, "dist/miui_cleaner_app"),
		filename: "[name].js",
	},
	target: "node",
	plugins: [
		// Add your plugins here
		// Learn more about plugins from https://webpack.js.org/configuration/plugins/
		new CleanWebpackPlugin(),
		new AutojsDeployPlugin(),
	],
	module: {
		rules: [
			// Add your rules for custom modules here
			// Learn more about loaders from https://webpack.js.org/loaders/
			{
				test: /\.(js|jsx)$/i,
				use: [
					{
						loader: "buble-loader",
						options: bubleCfgRhino(),
					},
					{
						loader: "babel-loader",
						options: babelConfig,
					},
				],
			},
			{
				test: /\.(png|svg|jpg|gif)$/,
				use: {
					loader: "url-loader",
				},
			},
		],
	},
};

module.exports = (o) => {
	const isProduction = o.WEBPACK_BUILD;
	if (isProduction) {
		config.mode = "production";
		config.devtool = false;
		config.plugins.push(
			new webpack.DefinePlugin({
				DEBUG: JSON.stringify(false),
			}),
		);
	} else {
		config.mode = "development";
		config.devtool = "source-map";
		config.plugins.push(
			new webpack.DefinePlugin({
				DEBUG: JSON.stringify(true),
			}),
		);
	}
	return config;
};
