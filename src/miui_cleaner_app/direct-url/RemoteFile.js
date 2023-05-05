const fetch = global.fetch || require("../fetch");
const util = global.util || require("util");
const setCookie = require("set-cookie-parser");
const jsonParse = require("json5/lib/parse");
const Headers = global.Headers || require("headers-polyfill").Headers;

if (!Headers.prototype.getSetCookie) {
	// https://developer.mozilla.org/en-US/docs/Web/API/Headers/getSetCookie
	Headers.prototype.getSetCookie = function getSetCookie () {
		const cookie = this.get("Set-Cookie");
		return cookie ? cookie.split(/,\s*(?=\S+=)/) : [];
	};
}

let userAgent;
try {
	userAgent = android.webkit.WebSettings.getDefaultUserAgent(context);
} catch (ex) {
	userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1";
}

let mime;
try {
	mime = android.webkit.MimeTypeMap.getSingleton();
} catch (ex) {
	mime = require("mime");
	mime.getExtensionFromMimeType = mime.getExtension;
	mime.getMimeTypeFromExtension = mime.getType;
	mime.getFileExtensionFromUrl = (url) => {
		return new URL(url).pathname.match(/(\.\w+)?$/, "$1")[0].slice(1);
	};
}

function parseSize (size) {
	if (Number.isInteger(size)) {
		return size;
	}
	let number = Number.parseFloat(size);
	if (number && size.match) {
		size = size.match(/\d+\s*([^\s\d]+)$/i);
		if (size) {
			size = "BKMGTPEZY".indexOf(size[1][0].toUpperCase());
			if (size < 0) {
				return;
			}
			number = Math.round(number * Math.pow(1024, size));
		} else if (!Number.isInteger(number)) {
			return;
		}
		return number;
	}
}

class RemoteFile {
	constructor (data) {
		Object.assign(this, data);
	}

	#fileName;
	get fileName () {
		let fileName = this.#fileName;
		if (fileName == null) {
			const url = this.location || this.url;
			if (url) {
				fileName = new URL(url).pathname.replace(/^.*[\\/]/, "");
				if (!/\.\w+$/.test(fileName) && this.#contentType) {
					const ext = mime.getExtensionFromMimeType(this.#contentType);
					if (ext) {
						fileName = fileName + "." + ext;
					}
				}
			}
		}
		return fileName;
	}

	set fileName (fileName) {
		if (fileName != null) {
			this.#fileName = fileName;
		}
	}

	#contentLength;
	get contentLength () {
		return this.#contentLength;
	}

	set contentLength (value) {
		value = Number.parseInt(value);
		if (Number.isInteger(value)) {
			this.#contentLength = value;
		}
	}

	#size;
	get size () {
		return this.#contentLength || this.#size;
	}

	set size (value) {
		value = parseSize(value);
		if (Number.isInteger(value)) {
			this.#size = value;
		}
	}

	#lastModified;
	get lastModified () {
		return this.#lastModified;
	}

	set lastModified (date) {
		let time = Date.parse(date);
		if (Number.isInteger(time)) {
			date = time;
		} else if (date && date.match) {
			let lastTime = date.match(/^(\d+)\s*(.*)前$/);
			if (lastTime) {
				date = Date.now() - (+lastTime[1] * 1000 * ({
					天: 60 * 60 * 24,
					小时: 60 * 60,
					分钟: 60,
					分: 60,
					秒钟: 1,
					秒: 1,
				}[lastTime[2]]));
			} else if ((lastTime = date.match(/^(.*)天\s*((?:\d+:+)*\d+)/))) {
				time = lastTime[2].split(":");
				time = Date.parse(new Date().toLocaleDateString() + ` ${time[0]}:${time[1]}:${time[2] || 0} GMT+0800`);
				time -= ({
					昨: 1,
					前: 2,
				}[lastTime[1]] || 0) * 60 * 60 * 24 * 1000;
				date = time;
			} else {
				return;
			}
			if (!Number.isInteger(date)) {
				return;
			}
		}
		this.#lastModified = date;
	}

	#expires;
	get expires () {
		return this.#expires;
	}

	set expires (date) {
		date = Date.parse(date);
		if (Number.isInteger(date)) {
			this.#expires = date;
		}
	}

	#contentType;
	get contentType () {
		const type = this.#contentType;
		if (!type && this.#fileName) {
			return mime.getMimeTypeFromExtension(this.#fileName.match(/(\.\w+)?$/, "$1")[0].slice(1));
		}
		return type;
	}

	set contentType (type) {
		if (type && !/^application\/octet-stream$/i.test(type) && /\w+\/\w+/.test(type)) {
			this.#contentType = type;
		}
	}

	#url;
	set url (url) {
		if (url) {
			this.#url = url;
		}
	}

	get url () {
		return this.#fixurl(this.#url);
	}

	#location;
	set location (url) {
		if (url) {
			this.#location = url;
		}
	}

	get location () {
		return this.#fixurl(this.#location);
	}

	#fixurl (url) {
		if (url) {
			if (this.#fileName) {
				url = url.replace(/([?&](?:fs|file)name=).*?(&|$)/i, (s, prefix, suffix) => prefix + this.#fileName + suffix);
			}
			return url;
		}
	}

	// if (fileInfo.location && fileInfo.fileName) {
	// 	fileInfo.location = fileInfo.location
	// }

	getUrl () {
		return this.url;
	}

	async getLocation (redirect) {
		let file = this;
		if (file.location && !redirect) {
			return file.location;
		}
		file = await file.browser.fetch(await file.getUrl(), {
			file,
			headers: {
				Accept: "*/*",
			},
			redirect,
			method: "HEAD",
		});
		return file.location;
	}

	#versionName;

	set versionName (versionName) {
		if (versionName) {
			this.#versionName = versionName;
		}
	}

	get versionName () {
		if (this.#versionName) {
			return this.#versionName;
		}
		let versionName;
		if (
			[
				this.fileName,
				this.path,
			].filter(Boolean).some(path => {
				versionName = path.match(/\d+(\.+\d+)+/);
				versionName = versionName && versionName[0];
				return versionName;
			})
		) {
			return versionName;
		}
	}

	#versionCode;

	set versionCode (versionCode) {
		if (Number.isInteger(versionCode)) {
			this.#versionCode = versionCode;
		}
	}

	get versionCode () {
		if (Number.isInteger(this.#versionCode)) {
			return this.#versionCode;
		}
		let versionCode;
		if (
			[
				this.fileName,
				this.path,
			].filter(Boolean).some(path => {
				versionCode = path.match(/\(\s*(\d+)\s*\)/);
				versionCode = versionCode && versionCode[1];
				return versionCode;
			})
		) {
			return +versionCode;
		}
	}

	valueOf () {
		const data = {};
		[
			"id",
			"fileName",
			"path",
			"size",
			"referrer",
			"url",
			"location",
			"contentType",
			"appName",
			"packageName",
			"versionName",
			"versionCode",
			// "browser",
			// "headers",
			// "browser",
		].concat(Object.keys(this)).forEach(key => {
			const value = this[key];
			if (value != null && !/^function|object$/.test(typeof value)) {
				data[key] = value;
			}
		});
		[
			"lastModified",
			"expires",
		].forEach(time => {
			if (this[time]) {
				data[time] = new Date(this[time]);
			}
		});
		return data;
	}

	[util.inspect.custom || "inspect"] () {
		return this.constructor.name + " " + util.inspect(this.valueOf());
	}
}

function parerDefault (value) {
	return value;
}

function getRandomIP () {
	let ip = [218, 66, 60, 202, 204, 59, 61, 222, 221, 62, 63, 64, 122, 211];
	ip = [
		ip[Math.floor(Math.random() * ip.length)],
	];
	for (let i = 0; i < 3; i++) {
		ip.push(Math.floor(Math.random() * 256));
	}
	return ip.join(".");
}

class Browser {
	constructor (parseHTML, parseJSON, parseFile) {
		const ip = getRandomIP();
		this.#headers = {
			"Accept-Language": "zh-CN",
			"User-Agent": userAgent,
			"X-Forwarded-For": ip,
			"X-Client-IP": ip,
			"X-Real-IP": ip,
		};
		this.#cookie = new Map();
		if (parseHTML) {
			this.parseHTML = parseHTML;
		}
		if (parseFile) {
			this.parseFile = parseFile;
		}
		if (parseJSON) {
			this.parseJSON = parseJSON || parerDefault;
		}
	}

	static RemoteFile = RemoteFile;
	RemoteFile = RemoteFile;
	parseHTML (html) {
		let url;
		const meta = html.match(/<meta\s+http-equiv="refresh"\s+content="\d+;url=(.*?)"/i);
		if (meta) {
			url = meta[1];
		} else {
			const js = html.match(/\b(?:\w+\.)*location(?:\.href)?\s*=\s*(("|').*?\2)/);
			if (js) {
				url = jsonParse(js[1]);
			} else {
				return;
			}
		}
		return {
			url: decodeURI(url),
		};
	}

	parseJSON = parerDefault;
	parseFile (fileInfo) {
		if (!fileInfo.referrer) {
			fileInfo.referrer = this.location?.href;
		}
		if (!fileInfo.headers && fileInfo.url) {
			const [
				url,
				options,
			] = this.getFetchArgs(fileInfo.url, {
				headers: {
					Accept: "*/*",
					Referer: fileInfo.referrer,
				},
			});
			fileInfo.url = url.href;
			fileInfo.headers = options.headers;
		}
		fileInfo.browser = this;
		return new (this.RemoteFile)(fileInfo);
	}

	#headers;
	#cookie;

	setCookie (cookie) {
		cookie = setCookie.parseString(cookie);
		if (cookie.expires && Date.now() > cookie.expires) {
			this.#cookie.delete(cookie.name);
		} else {
			this.#cookie.set(
				cookie.name,
				cookie,
			);
		}
	}

	getCookie (url) {
		return Array.from(this.#cookie.values()).filter(cookie => (
			url.pathname.startsWith(cookie.path || "") &&
			url.host.endsWith(cookie.domain || "") &&
			(!cookie.expires || cookie.expires > Date.now())
		)).map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
	}

	getFetchArgs (url, options = {}) {
		url = new URL(
			url.href || url,
			this.location,
		);

		const mayApi = /\bapi\b/.test(url);

		options = {
			...options,
			headers: {
				...this.#headers,
				"Accept": mayApi ? "application/json" : "text/html",
				"Referer": this.location?.href || null,
				"Cookie": this.getCookie(url),
				"X-Requested-With": (mayApi || /^\w+\/json\b/i.test(options.headers?.Accept)) ? "XMLHttpRequest" : null,
				...options.file?.headers,
				...options.headers,
			},
			redirect: (typeof options.redirect === "string") ? options.redirect : (options.redirect ? "follow" : "manual"),
		};
		return [
			url,
			options,
		];
	}

	async fetch (url, options) {
		[
			url,
			options,
		] = this.getFetchArgs(url, options);
		if (options?.signal?.aborted) {
			return;
		}
		const res = await fetch(
			url.href,
			options,
		).catch(ex => {
			ex.message = [
				url.href,
				ex.message,
			].filter(Boolean).join("\n");
			throw ex;
		});

		res.headers.getSetCookie().forEach(this.setCookie, this);

		const headers = res.headers;
		const contentType = headers.get("content-type");
		let location;
		let fileInfo;

		if (res.ok) {
			let contentDisposition = headers.get("content-disposition");
			if (contentDisposition || /^HEAD$/i.test(options.method)) {
				// 20X 下载
				contentDisposition = contentDisposition && contentDisposition.match(/(^|;)\s*filename\*?\s*=\s*(UTF-\d+(''|\/))?(.*?)(;|\s|$)/i);
				contentDisposition = contentDisposition && decodeURI(contentDisposition[4]);
				fileInfo = {
					fileName: contentDisposition,
					expires: headers.get("expires"),
					lastModified: headers.get("last-modified"),
					contentLength: +headers.get("content-length"),
					contentType: contentType.replace(/\s*;.*$/, ""),
					location: res.url,
					headers: options.headers,
				};
			} else if (/^text\/html\b/i.test(contentType)) {
				this.location = url;
				fileInfo = await this.parseHTML(await res.text(), res);
				const parseFile = fileInfo => Array.isArray(fileInfo) ? fileInfo.map(parseFile) : this.parseFile(fileInfo);
				return parseFile(fileInfo);
			} else if (/^\w+\/json\b/i.test(contentType)) {
				return this.parseJSON(await res.json(), res);
			}
		} else if ((location = headers.get("location"))) {
			// 30X 跳转
			fileInfo = {
				location,
				headers: options.headers,
			};
		} else {
			throw new Error(`status: ${res.status}\nmessage: ${res.message || JSON.stringify(await res.text())}\n    at ${res.url}`);
		}
		if (options.file) {
			fileInfo = Object.assign(options.file, fileInfo);
		} else {
			fileInfo = this.parseFile(fileInfo);
		}
		return fileInfo;
	}
}

module.exports = Browser;
// (async () => {
// 	const file = await new Browser().fetch("https://www.kookong.com/kk_apk.html");
// console.log(file);
// 	await file.getLocation();
// 	console.log(file);
// })();
