const okhttp3 = global.Packages.okhttp3;
const Headers = global.Headers || require("headers-polyfill").Headers;
// const ReadableStream = global.ReadableStream || require("web-streams-ponyfill").ReadableStream;
const Blob = require("blob-polyfill").Blob;
// const FormData = global.FormData || require("formdata-polyfill").Headers;

function fetchAny (url, options = {}) {
	if (Array.isArray(url)) {
		let controller;
		if (!options.signal) {
			if (global.AbortController) {
				controller = new AbortController();
				options.signal = controller.signal;
			} else {
				options.signal = events.emitter(threads.currentThread());
			}
		}
		return Promise.any(url.map(url => fetch(url, options))).then(res => {
			if (controller) {
				controller.abort();
			} else if (options.signal?.emit) {
				options.signal.emit("abort");
			}
			return res;
		});
	} else {
		return fetch(url, options);
	}
}

function fetch (url, options = {}) {
	options = {
		method: "GET",
		...options,
	};

	if (options.signal?.aborted) {
		return;
	}

	console.time(url);
	const call = http.client().newCall(http.buildRequest(url, options));
	const work = events.emitter(threads.currentThread());
	call.enqueue(new okhttp3.Callback({
		onResponse: function (call, res) {
			try {
				res = wrapResponse(res, options);
			} catch (ex) {
				work.emit("error", ex);
				return;
			}
			work.emit("response", res);
			console.timeEnd(url);
		},
		onFailure: function (call, err) {
			work.emit("error", err);
		},
	}));

	if (options.signal) {
		const abort = () => {
			call.isCanceled() || call.cancel();
			work.emit("error", new Error(options.signal.reason || "The user aborted a request."));
		};
		if (options.signal.addEventListener) {
			options.signal.addEventListener("abort", abort);
		} else if (options.signal.on) {
			options.signal.on("abort", abort);
		}
	}
	return new Promise((resolve, reject) => {
		work.once("response", resolve);
		work.once("railure", reject);
		work.once("error", reject);
	});
}

const _response = new Map();
class Response {
	get status () {
		return _response.get(this).code();
	}

	get ok () {
		return this.status >= 200 && this.status < 300;
	}

	get url () {
		return _response.get(this).request().url();
	}

	get redirected () {
		return _response.get(this).isRedirect();
	}

	get statusText () {
		return _response.get(this).message();
	}

	get headers () {
		return _response.get(_response.get(this)).getHeaders();
	}

	get body () {
		return _response.get(_response.get(this)).getBody();
	}

	blob () {
		return _response.get(_response.get(this)).getBlob();
	}

	arrayBuffer () {
		this.blob().arrayBuffer();
	}

	text () {
		return _response.get(_response.get(this)).getBodyText();
	}

	json () {
		return this.text().then(text => JSON.parse(text));
	}

	clone () {
		const response = Object.create(Response.prototype);
		_response.set(response, _response.get(this));
		return response;
	}
}
function hexToArrayUint8Array (input) {
	const view = new Uint8Array(input.length / 2);
	for (let i = 0; i < input.length; i += 2) {
		view[i / 2] = parseInt(input.substring(i, i + 2), 16);
	}
	return view;
}
// https://square.github.io/okhttp/4.x/okhttp/okhttp3/-response/
function wrapResponse (res) {
	const response = Object.create(Response.prototype);
	_response.set(response, res);
	let headers;
	const body = res.body();
	const bodyByteString = body.byteString();
	body.close();
	const contentType = body.contentType();
	let text;
	const bodyToText = () => {
		if (text === undefined) {
			text = new java.lang.String(bodyByteString.toByteArray(), contentType.charset() || "UTF-8");
		}
		return text;
	};
	let blob;
	const bodyToBlob = () => {
		if (!blob) {
			blob = blob = new Blob([
				hexToArrayUint8Array(bodyByteString.hex()),
			], {
				type: `${contentType.type()}/${contentType.subtype()}`,
			});
		}
		return blob;
	};
	const resProps = {
		getHeaders: () => {
			if (!headers) {
				headers = new Headers();
				res.headers().forEach(entry => {
					headers.append(entry.first, entry.second);
				});
			}
			return headers;
		},
		getBlob: () => {
			return Promise.resolve().then(bodyToBlob);
		},
		getBody: () => {
			return bodyToBlob().stream();
		},
		getBodyText: (fnName) => {
			return Promise.resolve().then(bodyToText);
		},
	};
	_response.set(res, resProps);
	return response;
}

module.exports = fetchAny;
