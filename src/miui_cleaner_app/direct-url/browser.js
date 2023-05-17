const setCookie = require("set-cookie-parser");
const jsonParse = require("json5/lib/parse");
// const Headers = global.Headers || require("headers-polyfill").Headers;
const RemoteFile = require("./remotefile");
const UserAgent = require("user-agents");
if (global.Headers && !Headers.prototype.getSetCookie) {
	// https://developer.mozilla.org/en-US/docs/Web/API/Headers/getSetCookie
	Headers.prototype.getSetCookie = function getSetCookie () {
		const cookie = this.get("Set-Cookie");
		return cookie ? cookie.split(/,\s*(?=\S+=)/) : [];
	};
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
			"User-Agent": new UserAgent({ deviceCategory: "mobile" }).toString(),
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
		if (!(fileInfo instanceof RemoteFile)) {
			fileInfo = new (this.RemoteFile)(fileInfo);
		}
		return fileInfo;
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
				"Referer": this.location?.href || "",
				"Cookie": this.getCookie(url),
				"X-Requested-With": (mayApi || /^\w+\/json\b/i.test(options.headers?.Accept)) ? "XMLHttpRequest" : "",
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
				if (!options.file || Array.isArray(fileInfo)) {
					const parseFile = fileInfo => Array.isArray(fileInfo) ? fileInfo.map(parseFile) : this.parseFile(fileInfo);
					return parseFile(fileInfo);
				}
			} else if (/^\w+\/json\b/i.test(contentType)) {
				return this.parseJSON(await res.json(), res);
			} else if (/^text\/plain\b/i.test(contentType)) {
				fileInfo = await res.text();
				try {
					fileInfo = jsonParse(fileInfo);
				} catch (ex) {
					return fileInfo;
				}
				return this.parseJSON(fileInfo, res);
			}
		} else if ((location = headers.get("location"))) {
			// 30X 跳转
			fileInfo = {
				location,
				headers: options.headers,
			};
		} else {
			throw new Error(`status: ${res.status}\nmessage: ${res.message || JSON.stringify(await res.text())}\n\tat ${res.url}`);
		}
		if (options.file) {
			fileInfo = Object.assign(options.file, fileInfo);
		}
		return this.parseFile(fileInfo);
	}
}

module.exports = Browser;
