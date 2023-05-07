const Browser = require("./browser");
const parsers = [
	require("./123pan"),
	require("./lanzou"),
	require("./coolapk"),
	require("./github"),
	require("./32r"),
];

async function defaultParser (url) {
	const file = await new Browser().fetch(url);
	if (!Array.isArray(file) && !file.size) {
		await file.getLocation(true);
	}
	return file;
}
function directUrl (url) {
	if (!url.hostname) {
		url = new URL(url);
	}
	const parser = parsers.find(parser => parser.test(url.hostname)) || defaultParser;
	return parser(url);
}

module.exports = directUrl;
