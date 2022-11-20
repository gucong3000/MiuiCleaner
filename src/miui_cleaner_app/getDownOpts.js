const evalScript = (...args) => {
	function query (selector, action) {
		let elems = document.querySelectorAll(selector);
		elems = Array.from(elems);
		if (!action) {
			action = ele => ele.click();
		}
		elems = elems.map(action);
		return elems;
	}

	// const globalValue = {};
	args.forEach((param) => {
		// globalValue[param[0]] = param[1];
		query(`#${param[0]}, .${param[0]}`, ele => (ele.value = param[1]));
	});

	if (/(^|\.)123pan.com$/i.test(location.hostname)) {
		query(".ant-checkbox input", checkbox => checkbox.checked || checkbox.click());
		query("button", button => button.lastChild.data === "下载文件" && button.click());
	} else if (/(^|\.)coolapk.com$/i.test(location.hostname)) {
		query(".apk_topbar_btn");
	} else if (/(^|\.)lanzou\w+.com$/i.test(location.hostname)) {
		const fileInfo = {
			// userAgent: navigator.userAgent,
			// referer: location.href,
			fileName: document.querySelector(".appname, .md")?.firstChild.data.trim(),
			time: document.querySelector(".appinfotime")?.innerText.trim() || Array.from(
				document.querySelectorAll(".mt2"),
			).map(
				ele => ele.nextSibling?.data.trim(),
			).find(
				text => text && /^\d/.test(text),
			),
			size: Array.from(
				document.querySelectorAll("#submit,.mtt"),
			).map(
				ele => ele.innerText.match(/\(\s*(.*?)\s*\)/),
			).filter(Boolean).map(
				text => text[1],
			)[0],
			id: location.pathname.replace(/^\/(tp\/)*/i, ""),
		};

		let ajax;
		Array.from(document.scripts).some(script => {
			script = script.innerHTML.trim();
			if (!script) {
				return false;
			}

			const hostname = script.match(/(['"])(https?:\/\/(\w+\.)*lanzoug\w*(\.\w+)+\/file\/?)\1/i);
			const pathname = script.match(/(['"])(\?\S{256,})\1/);
			if (hostname && pathname) {
				fileInfo.url = new URL(pathname[2], hostname[2]).href;
				return true;
			}
			const ajaxCode = script.match(/\$.ajax\({([\s\S]+?)}\);/);
			if (ajaxCode) {
				const that = Object.create(window);
				function getVal (code) {
					if (code in that) {
						return that[code];
					}
					try {
						/* eslint no-new-func: "off" */
						return new Function(`return ${code};`).call(that);
					} catch (ex) {
						//
					}
				}
				script.slice(0, ajaxCode.index).split(/\r?\n/).forEach(line => {
					line = line.trim();
					if (line.startsWith("//")) {
						return false;
					}
					line = line.match(/^((var|let|const)\s+)?(\w+)\s*=\s*(.*?);?$/);
					if (line) {
						that[line[3]] = getVal(line[4]);
					}
				});

				const ajaxConfig = {};
				let inData;
				const data = {};
				ajaxCode[1].replace(/\s*(}\s*,?)\s*/g, "\n$1\n").replace(/(,|{)\s*/g, "$1\n").split(/\r?\n/).forEach(line => {
					line = line.trim();
					if (line.startsWith("//")) {
						return false;
					}
					if (/^}\s*,?$/.test(line)) {
						inData = false;
					} else {
						line = line.match(/^(['"])?(\S+)\1\s*:\s*(.+?)\s*,?$/);
						if (line) {
							let inEnd;
							const key = line[2];
							const value = line[3].replace(/\s+}$/, () => {
								inEnd = true;
								return "";
							});
							if (key === "data") {
								inData = true;
								ajaxConfig.data = data;
							} else if (inData) {
								data[key] = getVal(value);
								if (inEnd) {
									inData = false;
								}
							} else {
								ajaxConfig[key] = getVal(value);
							}
						}
					}
				});
				if (ajaxConfig.url && ajaxConfig.data) {
					ajax = ajaxConfig;
					return true;
				}
			}
			return false;
		});
		if (ajax) {
			return new Promise((resolve, reject) => {
				ajax.success = resolve;
				ajax.error = reject;
				window.$.ajax(ajax);
				// xhr.overrideMimeType("application/json");
			}).then(data => {
				if (Array.isArray(data.text)) {
					const baseUrl = location.origin;
					return data.text.map(file => (Object.assign(
						file,
						{
							fileName: file.name_all,
							url: new URL("/tp/" + file.id, baseUrl).href,
						},
					)));
				} else if (data.url && data.inf && data.dom) {
					return Object.assign(
						data,
						fileInfo,
						{
							fileName: data.inf,
							url: new URL(data.url, new URL("/file/", data.dom)).href,
						},
					);
				}
				return data;
			});
		} else if (fileInfo.url || !location.pathname.startsWith("/tp/")) {
			return fileInfo;
		}
	}
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			reject(new Error("timeout"));
		}, 0xfff);
	});
};
const asyncFnWrap = (taskId, fn, args) => {
	function toError (reason) {
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
			reason: toError(reason),
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
				reason: toError(reason),
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
const request = require("./request");
const dialogs = require("./dialogs");
const downFile = require("./downFile");
const prettyBytes = require("pretty-bytes");

const MessageLevel = android.webkit.ConsoleMessage.MessageLevel;
require("core-js/modules/es.promise.any");
require("core-js/modules/web.url.js");
require("core-js/modules/web.url-search-params");

const dateFormat = android.text.format.DateFormat.getDateFormat(activity);
function iec (number, options) {
	return prettyBytes(number, {
		binary: true,
		...options,
	});
}

function fastgit (url, hostname = "download.fastgit.org") {
	url.hostname = hostname;
	return url.href;
}

function toDownOpts (url) {
	if (!url.href) {
		url = new URL(url);
	}
	if (/(^|\.)firepx\.com$/i.test(url.hostname)) {
		return request(url.href).then(res => {
			const body = res.body.string();
			const link = body.match(/<a\s*\bhref="(.*?)".*密码\s*[:：]\s*(\w+)/);
			if (link) {
				const newUrl = new URL(link[1], url.href);
				if (newUrl.hostname !== url.hostname) {
					newUrl.hash = "#pwd=" + link[2];
					return toDownOpts(newUrl);
				}
			}
			return openWeb(url);
		});
	} else if (url.hostname === "github.com") {
		const pathInfo = url.pathname.match(/\/releases\/(.+)$/);
		if (pathInfo) {
			if (pathInfo[1].includes("/")) {
				return request(
					[
						url.href,
						"https://gh.api.99988866.xyz/" + url.href,
						fastgit(url),
					],
					{
						method: "HEAD",
					},
				);
			} else {
				url.hostname = "api." + url.hostname;
				url.pathname = "/repos" + url.pathname;
				return request.getJson(url.href).then(
					release => release.assets.filter(
						asset => asset.content_type === "application/vnd.android.package-archive",
					).map(
						asset => ({
							...asset,
							mimeType: asset.content_type,
							url: asset.browser_download_url,
							fileName: asset.name,
							time: asset.updated_at,
						}),
					),
				);
			}
		}
	} else if (/(^|\.)32r\.com$/i.test(url.hostname)) {
		const pathInfo = url.pathname.match(/^\/app\/(\d+).html$/i);
		if (pathInfo) {
			url.hostname = "m.32r.com";
			url.pathname = "/downapp/" + pathInfo[1];
			return request(
				url.href,
				{
					method: "HEAD",
				},
			);
		}
	}
	return openWeb(url);
}

function openWeb (url) {
	console.log("使用webView解析：", url.href || url);
	const webView = ui.inflate(`
		<webview />
	`);
	const jsbridge = events.emitter();
	let taskId = 0;
	const docReady = {};

	// https://developer.android.google.cn/reference/android/webkit/WebSettings
	const settings = webView.getSettings();
	settings.setBlockNetworkImage(true);
	settings.setJavaScriptEnabled(true);
	settings.setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
	// settings.setUserAgentString(true);
	function evaluateJavascript (fn, args) {
		return new Promise((resolve, reject) => {
			function then (result) {
				if (result.status === "fulfilled") {
					resolve(result.value);
				} else if (result.status === "rejected") {
					const error = result.reason && Object.assign(new (global[result.reason.name] || Error)(result.reason.message), result.reason);
					reject(error);
				}
			}
			function onReceiveValue (result) {
				result = result && JSON.parse(result);
				if (result) {
					if (result.status) {
						return then(result);
					} else if (typeof result === "string" && result.startsWith("jsbridge://")) {
						return jsbridge.once(result.slice(11), then);
					}
				}
				// reject(new Error("evaluateJavascript: no result"));
			};
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

	function pipeEvent (...args) {
		return jsbridge.emit.bind(jsbridge, ...args);
	}

	// https://developer.android.google.cn/reference/android/webkit/WebChromeClient
	webView.setWebChromeClient(
		new JavaAdapter(android.webkit.WebChromeClient, {
			onConsoleMessage: (msg) => {
				consoleMessage(msg, webView);
			},
			onProgressChanged: pipeEvent("progressChanged"),
		}),
	);
	// https://developer.android.google.cn/reference/android/webkit/WebViewClient
	webView.setWebViewClient(new JavaAdapter(android.webkit.WebViewClient, {
		shouldOverrideUrlLoading: (webView, webResourceRequest) => {
			let url = webResourceRequest.getUrl().toString();
			if (url.startsWith("jsbridge://")) {
				url = new URL(url);
				jsbridge.emit(url.host, JSON.parse(decodeURI(global.$base64.decode(url.pathname.slice(1)))));
				return true;
			}
			return false;
		},
		onReceivedError: (webView, webResourceRequest, ...args) => {
			if (webResourceRequest.isForMainFrame()) {
				jsbridge.emit("receivedError", webView, webResourceRequest, ...args);
			}
		},
		onPageFinished: pipeEvent("pageFinished"),
	}));
	webView.setDownloadListener({
		onDownloadStart: pipeEvent("downloadStart"),
	});

	jsbridge.on("pageFinished", checkReadyState);
	jsbridge.on("progressChanged", checkReadyState);
	function checkReadyState (webView, ...args) {
		const url = webView.getUrl();
		if (!url || /^\w+:\w+$/.test(url) || docReady[url]) {
			return;
		}
		evaluateJavascript(() => (
			document.body?.children.length && document.readyState === "complete"
		)).then(readyState => {
			if (!docReady[url] && readyState) {
				docReady[url] = true;
				jsbridge.emit("documentReady", webView, ...args);
			}
		});
	}
	const params = url.hash ? url.hash.replace(/^#+/, "").split(/\s*&\s*/g).map((value) => value.split(/\s*=\s*/g)) : null;
	const result = new Promise((resolve, reject) => {
		jsbridge.on("documentReady", () => {
			evaluateJavascript(evalScript, params).then(resolve, reject);
		});
		jsbridge.on("downloadStart", (url, userAgent, disposition, type, length) => {
			resolve({
				url,
				headers: {
					"content-disposition": disposition,
					"content-length": length,
					"content-type": type,
				},
				// referer: url.href || url,
			});
		});
		jsbridge.on("receivedError", (webView, webResourceRequest, webResourceError) => {
			reject(new Error(webResourceError.getDescription(), webResourceRequest.getUrl()));
		});
		webView.loadUrl(url.href || url);
	}).finally(cancel);

	function cancel () {
		webView.removeAllViews();
		webView.destroy();
	}
	result.cancel = cancel;
	return result;
}

function consoleMessage (msg, webView) {
	const message = msg.message();
	const sourceId = decodeURI(msg.sourceId());
	const href = decodeURI(webView.getUrl().replace(/#.*$/, ""));
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
	let stackTraces = [
		`${sourceId}}:${msg.lineNumber()}`,
	];
	if (sourceId !== href) {
		stackTraces.push(href);
	}
	stackTraces = stackTraces.map(trace => `\t@ ${trace}`);
	stackTraces.unshift(message);
	console[level](stackTraces.join("\n"));
}

function optToString (downOpts) {
	downOpts = this;
	let size = downOpts.size;
	let time = downOpts.time;
	try {
		size = size && iec(downOpts.size);
	} catch (ex) {
		//
	}
	const timeValue = time && Date.parse(time);
	if (timeValue) {
		time = dateFormat.format(timeValue);
	}
	return [
		downOpts.fileName,
		size,
		time,
	].filter(Boolean).join(" | ");
}

function urlNormalize (url) {
	url = url.href || url.url || url;
	url = url.replace(/^\w+:\/\/gh\.api(\.\w+)+\//, "");
	url = url.replace(/^(\w+:\/\/)(\w+\.)+fastgit(\.\w+)+/, "$1github.com");
	return url;
}

const downInfo = storages.create("download");
function getRealUrl (downOpts) {
	const id = downOpts.node_id || downOpts.id;
	const options = id && downInfo.get(id);

	if (options) {
		if (downFile.queryDownList(valueOf => {
			options.url = urlNormalize(options.url);
			if (urlNormalize(valueOf("URI")) === options.url) {
				let localFile = valueOf("LOCAL_URI");
				if (localFile) {
					localFile = android.net.Uri.parse(localFile).getPath();
					return files.exists(localFile);
				}
			}
		})) {
			return options;
		} else {
			downInfo.remove(id);
		}
	}
	if (downOpts.headers) {
		if (id) {
			downInfo.put(id, downOpts);
		}
		return downOpts;
	}
	return toDownOpts(
		downOpts.url,
	).then(readUrl => getRealUrl(Object.assign(downOpts, readUrl)));
}

function getDownOpts (url, appInfo) {
	console.log(appInfo);
	return toDownOpts(url).then(downOpts => {
		if (Array.isArray(downOpts)) {
			if (appInfo.packageName === "cn.litiaotiao.app") {
				downOpts = downOpts.filter(file => !file.fileName.includes("真实好友"));
			} else if (appInfo.packageName === "wangdaye.com.geometricweather" && appInfo.appName) {
				let subVer = appInfo.getVersionName().match(/_\w+$/);
				if (subVer) {
					subVer = subVer[0] + ".apk";
					subVer = downOpts.find(downOpts => downOpts.fileName.endsWith(subVer));
					if (subVer) {
						return subVer;
					}
				}
			}
			if (downOpts.length === 1) {
				downOpts = downOpts[0];
			} else {
				downOpts.forEach(downOpts => {
					downOpts.toString = optToString;
				});
				downOpts = dialogs.singleChoice(downOpts, { title: "请选择要下载的文件" });
			}
		}
		return downOpts;
	}).then(downOpts => {
		if (downOpts) {
			downOpts = getRealUrl(downOpts);
		}
		return downOpts;
	});
}

module.exports = getDownOpts;

if (DEBUG) {
	require("./test/getDownOpts")(toDownOpts);
}
