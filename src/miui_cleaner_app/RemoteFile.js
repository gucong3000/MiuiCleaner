const fetch = global.fetch || require("./fetch");
const util = global.util || require("util");
const setCookie = require("set-cookie-parser");
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
		date = Date.parse(date);
		if (!Number.isNaN(date)) {
			this.#lastModified = date;
		}
	}

	#expires;
	get expires () {
		return this.#expires;
	}

	set expires (date) {
		date = Date.parse(date);
		if (!Number.isNaN(date)) {
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
		if (type && !/^application\/octet-stream$/i.test(type)) {
			this.#contentType = type;
		}
	}

	async getLocation (redirect) {
		return this.browser.fetch(this.url, {
			file: this,
			headers: {
				Accept: "*/*",
			},
			redirect,
		});
	}

	valueOf () {
		const value = {
			// appName: this.appName,
			// versionName: this.versionName,
			// packageName: this.packageName,
			id: this.id,
			fileName: this.fileName,
			size: this.size,
			lastModified: this.lastModified && new Date(this.lastModified),
			expires: this.expires && new Date(this.expires),
			// cookie: this.cookie,
			referrer: this.referrer,
			url: this.url,
			location: this.location,
			contentType: this.contentType,
			browser: this.browser,
			headers: this.headers,
			// browser: this.browser,
		};
		Object.keys(this).forEach(key => {
			value[key] = this[key];
		});
		return value;
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
			"Accept": "text/html",
			"Accept-Language": "zh-CN",
			"User-Agent": userAgent,
			"X-Forwarded-For": ip,
			"X-Client-IP": ip,
			"X-Real-IP": ip,
		};
		this.#cookie = new Map();
		this.parseHTML = parseHTML;
		if (parseFile) {
			this.parseFile = parseFile;
		}
		if (parseJSON) {
			this.parseJSON = parseJSON || parerDefault;
		}
	}

	static RemoteFile = RemoteFile;

	parseHTML = parerDefault;
	parseJSON = parerDefault;
	parseFile (fileInfo) {
		if (fileInfo.location && fileInfo.fileName) {
			fileInfo.location = fileInfo.location.replace(/([?&](?:fs|file)name=).*?(&|$)/i, (s, prefix, suffix) => prefix + fileInfo.fileName + suffix);
		}
		if (!fileInfo.headers && fileInfo.url) {
			const [
				url,
				options,
			] = this.getFetchArgs(fileInfo.url, {
				header: {
					referer: fileInfo.referrer,
				},
			});
			fileInfo.url = url.href;
			fileInfo.headers = options.headers;
		}
		fileInfo.browser = this;
		if (!fileInfo.referrer) {
			fileInfo.referrer = this.url;
		}
		return new RemoteFile(fileInfo);
	}

	#url;
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
			this.#url,
		);
		options = {
			...options,
			headers: {
				...this.#headers,
				Referer: this.#url || "",
				Cookie: this.getCookie(url),
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

		const res = await fetch(
			url.href,
			options,
		);

		res.headers.getSetCookie().forEach(this.setCookie, this);

		const headers = res.headers;
		const contentType = headers.get("content-type");
		let contentDisposition;
		let location;
		let fileInfo;

		if (res.ok) {
			if (/^text\/html\b/i.test(contentType)) {
				this.#url = url.href;
				fileInfo = await this.parseHTML(await res.text(), res);
				if (Array.isArray(fileInfo)) {
					return fileInfo.map(this.parseFile, this);
				} else {
					return this.parseFile(fileInfo);
				}
			} else if (/^application\/json\b/i.test(contentType)) {
				return this.parseJSON(await res.json(), res);
			} if ((contentDisposition = headers.get("content-disposition")) || /^application\/\w+/i.test(contentType)) {
				// 20X 下载
				contentDisposition = contentDisposition && contentDisposition.match(/(^|;)\s*filename\*?\s*=\s*(UTF-8(''|\/))?(.*?)(;|\s|$)/i);
				contentDisposition = contentDisposition && decodeURI(contentDisposition[4]);
				fileInfo = {
					fileName: contentDisposition,
					expires: headers.get("expires"),
					lastModified: headers.get("last-modified"),
					contentLength: +headers.get("content-length"),
					contentType,
					location: res.url,
					headers: options.headers,
				};
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
			return Object.assign(options.file, fileInfo);
		} else {
			return this.parseFile(fileInfo);
		}
	}
}

module.exports = Browser;
