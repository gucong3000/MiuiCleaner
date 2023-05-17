const okhttp3 = global.Packages?.okhttp3;
const response = require("./response");

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
				if (options.signal?.aborted) {
					// TODO 完成aborted error功能
					return;
				}
				try {
					res = response.wrap(res);
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

module.exports = fetch;
