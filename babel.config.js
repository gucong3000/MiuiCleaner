module.exports = {
	sourceType: "script",
	targets: {
		rhino: "1.7.13",
	},
	presets: [
		"@babel/preset-env",
	],
	plugins: [
		"@babel/plugin-transform-runtime",
		"@babel/plugin-syntax-jsx",
	],
};
