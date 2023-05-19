const okhttp3 = global.Packages?.okhttp3;
const response = require("./response");

function fetch (url, options = {}) {
	options = {
		redirect: "follow",
		method: "GET",
		...options,
	};
	options.method = (options.method || "GET").toUpperCase();

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

		const client = http.client().newBuilder()
			.followRedirects(/^follow$/i.test(options.redirect))
			.build();
		const call = client.newCall(http.buildRequest(url, options));
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
}

// fetch("http://163.com").then(async res => {
// 	console.log(res);
// 	console.log(res.url);
// 	console.log(Object.fromEntries(res.headers));
// 	const blob = await res.blob();
// 	console.log(blob);

// 	console.log(await blob.text());
// 	console.log(await res.text());
// });

module.exports = fetch;
