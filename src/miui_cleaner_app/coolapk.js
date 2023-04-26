const fetch = global.fetch || require("./fetch");

let userAgent;
try {
	userAgent = android.webkit.WebSettings.getDefaultUserAgent(context);
} catch (ex) {
	userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1";
}

async function getFileInfo (url) {
	url = parseUrl(url);
	const res = await fetch(
		url.href,
		{
			headers: {
				"Accept": "text/html",
				"User-Agent": userAgent,
				"cookie": "token=123",
			},
		},
	);
	await checkResponse(res);
	const html = await res.text();
	const cookie = [];

	res.headers.forEach((value, key) => {
		if (key === "set-cookie") {
			console.log(`${key} ==> ${value}`);
			cookie.push(search(value, /^\s*(.*?)\s*(;|$)/));
		}
	});

	console.log(cookie);

	return new FileInfo(html, cookie.join("; "));
}

async function checkResponse (res) {
	if (!res.ok) {
		throw new Error(`status: ${res.status}\nmessage: ${res.message || JSON.stringify(await res.text())}\n    at ${res.url}`);
	}
}

function parseUrl (url) {
	if (!url.href) {
		url = new URL(url);
	}
	return url;
}

function search (str, reg, index = 1) {
	const result = str.match(reg);
	return result && result[index];
}

function parseSize (size) {
	if (size) {
		size = size.match(/^([+-\d.]+)\s*(\w+)?$/);
		const BIBYTE_UNITS = "BKMGTPEZY";
		const number = Number.parseFloat(size[1]);
		const exponent = BIBYTE_UNITS.indexOf(size[2][0].toUpperCase());
		if (!Number.isNaN(number) && exponent > 0) {
			return Math.round(number * Math.pow(1024, exponent));
		}
	}
}

async function getRealFile (fileInfo, redirect) {
	const res = await fetch(fileInfo.url, {
		headers: {
			"cookie": fileInfo.cookie,
			"Referer": fileInfo.referer,
			"User-Agent": userAgent,
		},
		redirect: redirect ? "follow" : "manual",
	});
	const location = res.headers.get("location");
	if (location) {
		fileInfo.location = location;
	} else {
		await checkResponse(res);
	}
	const disposition = res.headers.get("content-disposition");
	const type = res.headers.get("Content-Type");

	if (disposition || type === "application/vnd.android.package-archive") {
		fileInfo.location = location || res.url;
		const expires = res.headers.get("expires");
		if (expires) {
			fileInfo.expires = Date.parse(expires);
		}
		if (type && !/^application\/octet-stream$/i.test(type)) {
			fileInfo.type = type;
		}
		const size = +res.headers.get("content-length");
		if (size) {
			fileInfo._size = size;
		}
		const lastModified = res.headers.get("last-modified");
		if (lastModified) {
			fileInfo._lastModified = Date.parse(lastModified);
		}
	}

	if (fileInfo.location) {
		fileInfo.location = fileInfo.location.replace(/([?&]fsname=).*?(&|$)/, (s, prefix, suffix) => prefix + fileInfo.fileName + suffix);
		return fileInfo;
	} else {
		throw new Error("unknow error: \nat " + res.url);
	}
}

class FileInfo {
	constructor (html, cookie) {
		this._html = html;
		this.cookie = cookie;
	}

	search (reg, index = 1) {
		return search(this._html, reg, index);
	}

	get appName () {
		return this.search(/\bclass="detail_app_title"[^<>]*>\s*(.+?)\s*<\/?\w+/);
	}

	get versionName () {
		return this.search(/\bclass="list_app_info"[^<>]*>\s*(.+?)\s*<\/?\w+/);
	}

	get fileName () {
		return `${this.appName}_v${this.versionName}.apk`;
	}

	get packageName () {
		return this.search(/[&?](?:apkname|pn)=(.*?)["&]/);
	}

	get size () {
		return this._size || parseSize(this.search(/\bclass="apk_topba_message"[^<>]*>[\s\r\n]*(.+?)\s\//));
	}

	get lastModified () {
		if (this._lastModified) {
			return this._lastModified;
		}
		let date = this.search(/更新时间[:：]\s*(.*?)(<|$)/m);
		if (date) {
			// rhino 引擎下，Date.parse不能识别`2021-11-25 11:24:04`格式，脏办法修复一下
			if (!global.Intl) {
				date = date.replace(/^(\d+-\d+-\d+)\s+(\d+:\d+:\d+)$/, "$1T$2+0800");
			}
			return Date.parse(date);
		}
	}

	get id () {
		return search(this.url, /[&?]id=(.*?)["&]/);
	}

	get referer () {
		return "https://www.coolapk.com/apk/" + this.packageName;
	}

	get url () {
		return this.search(/"(https?:\/\/dl\.coolapk\.com\/down\?.*?)"/);
	}

	async getLocation (redirect) {
		return getRealFile(this, redirect);
	}
}

module.exports = getFileInfo;
// getFileInfo("https://www.coolapk.com/apk/com.microsoft.emmx").then(f => f.getLocation(1)).then(console.log);
