
if (!global.AbortController) {
	global.AbortController = require("abort-controller").AbortController;
}
if (!global.Blob) {
	global.Blob = require("blob-polyfill").Blob;
}
if (!global.Headers) {
	global.Headers = require("fetch-headers").Headers;
}
if (!global.Request) {
	// global.Request = require("./request").Request;
}
if (!global.Response) {
	// global.Response = require("./response").Response;
}
if (!global.fetch) {
	global.fetch = require("./fetch");
}

module.exports = global.fetch;

// fetch("http://163.com").then(async res => {
// 	console.log(res);
// 	console.log(res.url);
// 	console.log(Object.fromEntries(res.headers));
// 	const blob = await res.blob();
// 	console.log(blob);
// 	console.log(await blob.text());
// 	console.log(await res.text());
// });
