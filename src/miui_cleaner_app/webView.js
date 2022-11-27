const asyncFnWrap = (taskId, fn, args) => {
	function toErrorObj (reason) {
		if (reason instanceof Error) {
			const errObj = {};
			[
				"message",
				"name",
				"stack",
			].forEach(key => {
				if (reason[key]) {
					errObj[key] = reason[key];
				}
			});
			return errObj;
		}
		return reason;
	}

	let value;
	try {
		value = fn.apply(this, args);
	} catch (reason) {
		return {
			status: "rejected",
			reason: toErrorObj(reason),
		};
	}

	if (value && value.then) {
		const jsbridge = `jsbridge://async:${taskId}`;
		Promise.resolve(value).then(
			value => ({
				status: "fulfilled",
				value,
			}),
			reason => ({
				status: "rejected",
				reason: toErrorObj(reason),
			}),
		).then(result => {
			setTimeout(() => {
				location.href = `${jsbridge}/${btoa(encodeURI(JSON.stringify(result)))}`;
			}, 0);
		});
		return jsbridge;
	}
	return {
		status: "fulfilled",
		value,
	};
};

function webView (options) {
	console.log("使用webView解析：", options.url);
	const webView = ui.inflate(`
		<webview />
	`);

	const jsBridge = events.emitter();
	const consoleBridge = events.emitter();
	let taskId = 0;
	const docReady = {};

	// https://developer.android.google.cn/reference/android/webkit/WebSettings
	const settings = webView.getSettings();
	settings.setBlockNetworkImage(true);
	settings.setJavaScriptEnabled(true);
	settings.setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
	if (options.userAgent) {
		settings.setUserAgentString(options.userAgent);
	}
	if (DEBUG && webView.setWebContentsDebuggingEnabled) {
		webView.setWebContentsDebuggingEnabled(true);
	}
	// let lastValue;
	// jsBridge.on("pageFinished", (webView, url) => {
	// 	console.log("pageFinished", webView, url, lastValue);
	// 	setTimeout(() => {
	// 		console.log(lastValue);
	// 	}, 800);
	// });

	function evaluate (fn, args) {
		return new Promise((resolve, reject) => {
			function then (result) {
				if (result.status === "fulfilled") {
					resolve(result.value);
				} else if (result.status === "rejected") {
					const reason = result.reason;
					if (reason) {
						const error = new (global[result.reason.name] || Error)(reason.message, reason);
						reject(Object.assign(error, reason));
					} else {
						reject(reason);
					}
				}
			}
			function onReceiveValue (result) {
				// lastValue = result;
				result = result && JSON.parse(result);
				if (result) {
					if (result.status) {
						return then(result);
					} else if (typeof result === "string" && result.startsWith("jsbridge://")) {
						return jsBridge.once(result.slice(11), then);
					}
				}
				reject(new Error("evaluateJavascript: no result"));
			};
			jsBridge.once("receivedError", reject);
			webView.evaluateJavascript(
				`javascript:(${asyncFnWrap.toString().trim()})(${taskId++}, (${fn.toString().trim()}), ${JSON.stringify(args)});`,
				new JavaAdapter(
					android.webkit.ValueCallback,
					{
						onReceiveValue,
					},
				),
			);
		});
	}

	function consoleMessage (msg) {
		const MessageLevel = android.webkit.ConsoleMessage.MessageLevel;
		const message = msg.message();
		// if (sourceId !== href) {
		// 	return;
		// }
		let level;
		// https://developer.android.google.cn/reference/android/webkit/ConsoleMessage
		switch (msg.messageLevel()) {
			case MessageLevel.TIP: {
				level = "verbose";
				break;
			}
			case MessageLevel.WARNING: {
				if (message.startsWith("A parser-blocking,") || message.startsWith("Mixed Content:")) {
					return;
				}
				level = "warn";
				break;
			}
			case MessageLevel.ERROR: {
				level = "error";
				break;
			}
			case MessageLevel.DEBUG: {
				level = "info";
				break;
			}
			default: {
				level = "log";
				break;
			}
		}
		const href = webView.getUrl().replace(/#.*$/, "");
		const sourceId = msg.sourceId() || href;
		const stackTraces = [
			`${sourceId}:${msg.lineNumber()}`,
		];
		if (sourceId !== href) {
			stackTraces.push(href);
		}
		consoleBridge.emit("data", level, message, stackTraces.map(decodeURI));
		consoleBridge.emit(level, message, stackTraces);
	}

	function pipeEvent (...args) {
		return jsBridge.emit.bind(jsBridge, ...args);
	}

	// https://developer.android.google.cn/reference/android/webkit/WebChromeClient
	webView.setWebChromeClient(
		new JavaAdapter(android.webkit.WebChromeClient, {
			onConsoleMessage: consoleMessage,
			onProgressChanged: pipeEvent("progressChanged"),
		}),
	);
	// https://developer.android.google.cn/reference/android/webkit/WebViewClient
	webView.setWebViewClient(new JavaAdapter(android.webkit.WebViewClient, {
		shouldOverrideUrlLoading: (webView, webResourceRequest) => {
			let url = webResourceRequest.getUrl().toString();
			if (url.startsWith("jsbridge://")) {
				url = new URL(url);
				jsBridge.emit(url.host, JSON.parse(decodeURI(global.$base64.decode(url.pathname.slice(1)))));
				return true;
			}
			return false;
		},
		onReceivedError: (webView, resourceRequest, resourceError) => {
			if (resourceRequest.isForMainFrame()) {
				jsBridge.emit("receivedError", resourceError);
			}
		},
		onPageFinished: pipeEvent("pageFinished"),
	}));
	webView.setDownloadListener({
		onDownloadStart: (url, userAgent, disposition, type, length) => {
			jsBridge.emit("downloadStart", {
				url,
				headers: {
					"content-disposition": disposition,
					"content-length": length,
					"content-type": type,
					"user-agent": userAgent,
					// "referer": url.origin + url.pathname,
				},
			});
		},
	});

	jsBridge.on("pageFinished", checkReadyState);
	jsBridge.on("progressChanged", checkReadyState);
	function checkReadyState (webView, ...args) {
		const url = webView.getUrl();
		if (!url || /^\w+:\w+$/.test(url) || docReady[url]) {
			return;
		}
		return evaluate(() => (
			document.body?.children.length && document.readyState === "complete"
		)).then(readyState => {
			if (!docReady[url] && readyState) {
				docReady[url] = true;
				jsBridge.emit("documentReady", webView, ...args);
			}
			return readyState;
		});
	}

	function ready (...args) {
		return new Promise((resolve, reject) => {
			jsBridge.once("documentReady", () => resolve());
			jsBridge.once("pageFinished", () => resolve());
			jsBridge.once("receivedError", reject);
		}).then(() => args.length && evaluate(...args));
	}

	function cancel () {
		webView.removeAllViews();
		webView.destroy();
	}
	webView.loadUrl(options.url);
	return {
		webView,
		jsBridge,
		evaluate,
		console: consoleBridge,
		ready,
		cancel,
	};
}

module.exports = webView;
