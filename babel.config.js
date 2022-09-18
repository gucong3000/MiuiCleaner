module.exports = {
	sourceType: "module",
	presets: [
		[
			"@babel/preset-env",
			{
				modules: "commonjs",
				targets: {
					rhino: "1.7.13",
				},
			},
		],
	],
	plugins: [
		"@babel/plugin-transform-runtime",
		// "@babel/plugin-transform-regenerator"
	],
};
