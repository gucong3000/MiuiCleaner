const syntaxJsx = require("@babel/plugin-syntax-jsx").default;
const preset = require("@babel/preset-env").default;

function babelPluginTransformAutoJsx (babel) {
	const t = babel.types;
	return {
		name: "babel-plugin-transform-auto-jsx",
		inherits: syntaxJsx,
		visitor: {
			JSXElement (path) {
				if (path.parent.type === "JSXElement") {
					return;
				}
				let start = Number.MAX_SAFE_INTEGER;
				let end = 0;
				path.container.forEach(node => {
					start = Math.min(start, node.start);
					end = Math.max(end, node.end);
				});
				path.replaceWith(
					t.stringLiteral(
						path.hub.file.code.substring(start, end),
					),
				);
			},
		},
	};
};

module.exports = (api, opts) => {
	const config = preset(api, {
		targets: {
			rhino: opts.rhino || "1.7.13",
		},
		...opts,
	});
	// config.plugins.push("typescript");
	config.plugins.push(babelPluginTransformAutoJsx);
	config.plugins.push("@babel/plugin-transform-runtime");
	// config.plugins.push("@babel/plugin-transform-modules-commonjs");
	return config;
};
