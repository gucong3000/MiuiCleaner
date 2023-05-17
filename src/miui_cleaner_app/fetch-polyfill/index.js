
if (!global.AbortController) {
	global.AbortController = require("abort-controller");
}
if (!global.Headers) {
	global.Headers = require("./headers").Headers;
}
if (!global.Request) {
	// global.Response = require("./request");
}
if (!global.Response) {
	// global.Response = require("./response");
}
if (!global.fetch) {
	global.fetch = require("./fetch");
}

module.exports = global.fetch;
