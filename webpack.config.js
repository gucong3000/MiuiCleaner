// Generated using webpack-cli https://github.com/webpack/webpack-cli
// http://auto.moly.host/index.html#/template/template
const path = require("path");
const webpack = require("webpack");
const AutojsDeployPlugin = require("./autojs-deploy");
const babelConfig = require("./babel.config");

const config = {
	entry: {
		main: "./src/miui_cleaner_app/index.js",
		services: "./src/miui_cleaner_app/services.js",
	},
	output: {
		path: path.resolve(__dirname, "dist/miui_cleaner_app"),
		filename: "[name].js",
		clean: true,
	},
	target: "node",
	plugins: [
		new AutojsDeployPlugin({
			// {boolean|String|boolean[]|String[]} 添加`"ui";`前缀的chunk（output）名单，true代表project.json中定义的main，字符串代表文件名
			// {String} 必须的 project.json 的文件路径
			configFile: path.resolve(__dirname, "src/miui_cleaner_app/project.json"),
		}),
	],
	resolve: {
		alias: {
			"mime": require.resolve("./src/npm-alias/mime.js"),
			"user-agents": require.resolve("./src/npm-alias/user-agents.js"),
		},
	},
	externals: /^__.+__$/i,
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/i,
				use: [
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

module.exports = (env, args) => {
	const isProduction = args.mode ? args.mode === "production" : env.WEBPACK_BUILD;
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
