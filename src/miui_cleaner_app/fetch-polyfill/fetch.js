const okhttp3 = global.Packages?.okhttp3;
const response = require("./response");
const request = require("./request");

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
			const view = new Uint8Array(await options.arrayBuffer());
			if (view.length) {
				const buff = java.lang.reflect.Array.newInstance(java.lang.Byte, view.length);
				for (let i = 0; i < view.length; i++) {
					buff[i] = view[i];
				}
				body = okhttp3.RequestBody.create(okhttp3.MediaType.parse(options.contentType || ""), buff);
			}
		}

		return new Promise((resolve, reject) => {
			function abort () {
				if (call) {
					call.isCanceled() || call.cancel();
				}
				const ex = new Error(options.signal?.reason || "The user aborted a request.");
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
						work.emit("body", {
							bytes: okhttpBody.bytes(),
							contentType: okhttpBody.contentType(),
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
