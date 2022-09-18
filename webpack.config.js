// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");
let bubleCfgRhino = require("buble-config-rhino");
bubleCfgRhino = bubleCfgRhino.default || bubleCfgRhino;
const AutojsDeployPlugin = require("./autojs-deploy");

const babelConfig = require("./babel.config");

const config = {
	entry: {
		main: "./src/miui_cleaner_app/index.js",
		project: "./src/miui_cleaner_app/project.json",
	},
	output: {
		path: path.resolve(__dirname, "dist/miui_cleaner_app"),
		filename: "[name].js",
	},
	target: "node",
	plugins: [
		// Add your plugins here
		// Learn more about plugins from https://webpack.js.org/configuration/plugins/
		new AutojsDeployPlugin(),
	],
	module: {
		rules: [
			// Add your rules for custom modules here
			// Learn more about loaders from https://webpack.js.org/loaders/
			{
				test: /\.(js|jsx)$/i,
				use: [{
					loader: "buble-loader",
					options: bubleCfgRhino(),
				}, {
					loader: "babel-loader",
					options: babelConfig,
				}],
			},
			{
				test: /\bproject\.json$/,
				loader: "file-loader",
				options: {
					name: "[name].[ext]",
				},
			},
			{
				test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif|json)$/i,
				type: "asset",
			},
		],
	},
};

module.exports = () => {
	const isProduction = process.env.NODE_ENV === "production";
	if (isProduction) {
		config.mode = "production";
		config.devtool = "none";
	} else {
		config.mode = "development";
		config.devtool = "source-map";
	}
	return config;
};
