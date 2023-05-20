module.exports = {
	AbortController: require("abort-controller").AbortController,
	// Blob: require("blob-polyfill").Blob,
	Headers: require("fetch-headers").Headers,
	Request: require("./request").Request,
	Response: require("./response").Response,
	// ReadableStream: require("web-streams-polyfill").ReadableStream,
	fetch: require("./fetch"),
};
