const okhttp3 = global.Packages?.okhttp3;
const Headers = global.Headers || require("headers-polyfill").Headers;
// const ReadableStream = global.ReadableStream || require("web-streams-ponyfill").ReadableStream;
const Blob = global.Blob || require("blob-polyfill").Blob;
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
	return new Promise((resolve, reject) => {
		options = {
			redirect: "follow",
			method: "GET",
			...options,
		};
		options.method = options.method.toUpperCase();
		const client = http.client().newBuilder()
			.followRedirects(/^follow$/i.test(options.redirect))
			.build();
		const call = client.newCall(http.buildRequest(url, options));
		const work = events.emitter(threads.currentThread());
		work.once("response", resolve);
		work.once("error", reject);
		call.enqueue(new okhttp3.Callback({
			onResponse: function (call, res) {
				try {
					res = wrapResponse(res, options);
				} catch (ex) {
					work.emit("error", ex);
					return;
				}
				work.emit("response", res);
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
			if (options.signal.aborted) {
				return abort();
			}
			if (options.signal.addEventListener) {
				options.signal.addEventListener("abort", abort);
			} else if (options.signal.on) {
				options.signal.on("abort", abort);
			}
		}
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
		return _response.get(this).request().url().toString();
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
function wrapResponse (res, options) {
	if (/^error$/i.test(options.redirect) && res.isRedirect()) {
		throw new Error("unexpected redirect");
	}
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
				const _headers = res.headers();
				_headers.forEach(entry => {
					headers.append(entry.first, entry.second);
				});
				if (!headers.getSetCookie) {
					headers.getSetCookie = () => Array.from(_headers.values("Set-Cookie"));
				}
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

// fetch(
// 	"https://developer.lanzoug.com/file/?UjRbZQw9UGEHDgY+AzYGalJtAjpe5FPCA5BVtlaZU/sG41CUAchX5lOWB/gAsweqUKYC41ewUNtSs1fHAOUEUVIEW+sM2FCMB3wGYQN5BjFSJgIxXixTtAOLVfxW7VPOBo1Q4gHgV71T4AfoAMEH4FCeAqhXJlAzUiVXOgB6BGNSO1tgDDRQWwc4BjQDagY1UjkCPl42U2ADPVVjVjhTdAZgUHQBYVc0UzwHYABkBz9QPwIxVy5QIlIlV2wAbgQ1UmBbPAx+UDQHZQZ/A2UGP1InAjNeNFNoAz1ValY6U2EGM1A3AThXNVNgBzcAMAcyUDoCN1c+UGFSYldnAD8EMlJiWzwMM1A2B2gGYwNkBjJSOgIpXmBTIQNvVXVWf1MhBmNQdQE1V2dTOAdoAGMHMFA6AjBXLlAmUjxXPAA5BGNSb1s9DGdQMgdoBmgDZgYzUjoCMl4yU3cDYlU/Vn1TbwY3UDEBalc6Uz0HYABnBzBQOwIzVy5QJ1IlVyYAYQQ0UmdbNAxpUDQHaQZoA2MGMVIwAiFedFM4A3RVblY4U2IGMlApAW1XOlM8B38AZgc0UD8CKVc7UGNSc1c1ADAEOFJi",
// 	{
// 		redirect: "follow",
// 		// method: "HEAD",
// 		headers: {
// 			"Accept": "*/*",
// 			"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1",
// 			"Referer": "https://423down.lanzouv.com/tp/ic1wllc",
// 			"X-Forwarded-For": "202.247.192.146",
// 			"client-ip": "59.142.129.197",
// 		},
// 	},
// );
