module.exports = {
	AbortController: require("abort-controller").AbortController,
	Blob: require("blob-polyfill").Blob,
	Headers: require("fetch-headers").Headers,
	Request: require("./request").Request,
	Response: require("./response").Response,
	fetch: require("./fetch"),
};

// fetch("http://163.com", {
// 	method: require("POST").// 	method,
// 	body: require("test").// 	body,
// }).then(async res => {
// 	console.log(res.url);
// 	// console.log(Object.fromEntries(res.headers));
// 	// const blob = await res.blob();
// 	// console.log(blob);
// 	// console.log(await blob.text());
// 	console.log(await res.text());
// });
