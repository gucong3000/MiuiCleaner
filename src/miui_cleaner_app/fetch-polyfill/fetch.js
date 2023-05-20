const okhttp3 = global.Packages?.okhttp3;
const response = require("./response");
const request = require("./request");
const AbortError = request("./errors/abort-error");

function newCall (req, body) {
	const client = new okhttp3.OkHttpClient.Builder()
		.followRedirects(/^follow$/i.test(req.redirect))
		.build();
	const okhttpReq = new okhttp3.Request.Builder();
	okhttpReq.url(req.url);
	req.headers.forEach((value, key) => {
		okhttpReq.addHeader(key, value);
	});
	okhttpReq.method(req.method, body);
	return client.newCall(okhttpReq.build());
}

async function fetch (url, options) {
	try {
		options = new request.Request(url, options);
		let body = null;
		if (!["GET", "HEAD"].includes(options.method)) {
			const arrayBuffer = await options.arrayBuffer();
			if (arrayBuffer.byteLength) {
				body = okhttp3.RequestBody.Companion.create(
					okhttp3.MediaType.Companion.parse(
						options.headers.get("Content-Type") || "",
					),
					Array.from(new Uint8Array(arrayBuffer)),
				);
			}
		}

		return new Promise((resolve, reject) => {
			function abort () {
				if (call) {
					call.isCanceled() || call.cancel();
				}
				const ex = new AbortError(options.signal?.reason || "The user aborted a request.");
				if (work) {
					work.emit("error", ex);
				} else {
					reject(ex);
				}
			};

			function isAborted () {
				const aborted = options.signal?.aborted;
				if (aborted) {
					abort();
				}
				return aborted;
			};

			if (isAborted()) {
				return;
			}

			const call = newCall(options, body);
			const work = events.emitter(threads.currentThread());
			work.once("response", resolve);
			work.once("error", reject);

			call.enqueue(new okhttp3.Callback({
				onResponse: function (call, okHttpRes) {
					try {
						if (isAborted()) {
							return;
						}
						const jsRes = response.wrap(okHttpRes, new Promise((resolve, reject) => {
							work.once("body", resolve);
							work.once("error", reject);
						}));
						work.emit("response", jsRes);
						if (isAborted()) {
							return;
						}
						const okhttpBody = okHttpRes.body();
						const contentType = okhttpBody.contentType();
						const charset = contentType.charset();
						const bytes = charset ? null : okhttpBody.bytes();
						const text = charset ? okhttpBody.string() : null;
						if (isAborted()) {
							return;
						}
						work.emit("body", {
							text,
							bytes,
							type: `${contentType.type()}/${contentType.subtype()}`,
						});
					} catch (ex) {
						work.emit("error", ex);
					}
				},
				onFailure: function (call, err) {
					work.emit("error", err);
				},
			}));

			if (options.signal) {
				if (options.signal.addEventListener) {
					options.signal.addEventListener("abort", abort);
				} else if (options.signal.on) {
					options.signal.on("abort", abort);
				}
			}
		});
	} catch (e) {
		if (DEBUG) {
			const reason = [
				e.fileName,
				e.lineNumber,
				e.columnNumber,
			].filter(Boolean).join(":");
			if (reason) {
				console.error("\tat", reason);
			}
			console.error(e);
		} else {
			throw e;
		}
	}
}

module.exports = fetch;
