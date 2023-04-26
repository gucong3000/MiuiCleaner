const jsonParse = require("json5/lib/parse");
const fetch = global.fetch || require("./fetch");

let userAgent;
try {
	userAgent = android.webkit.WebSettings.getDefaultUserAgent(context);
} catch (ex) {
	userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1";
}
const storage = {};
const realFileCache = {};

async function getFileInfoFromUrl (url, options) {
	url = parseUrl(url);
	const res = await fetch(
		url.href,
		{
			headers: {
				"Accept": "text/html",
				"User-Agent": userAgent,
				"X-Forwarded-For": getRandomIP(),
				"client-ip": getRandomIP(),
			},
		},
	);
	await checkResponse(res);
	const html = await res.text();
	let fileName = html.match(/\bclass="(md|appname)"[^<>]*>\s*(.+?)\s*<\/?\w+/);
	fileName = fileName && fileName[2];
	let size = html.match(/\b(id|class)="(submit|mtt)"[^<>]*>.*?\(\s*(\d+.*?)\s*\)\s*<\/?\w+/);
	size = size && size[3];
	let lastModified = html.match(/\bclass="appinfotime"[^<>]*>\s*(.+?)\s*<\/?\w+/);
	if (lastModified) {
		lastModified = lastModified[1];
	} else {
		lastModified = html.match(/\bclass="mt2"[^<>]*>\s*(时间.*?)?\s*<\/\w+>\s*(.*?)\s*</);
		lastModified = lastModified && lastModified[2];
	}
	const fileInfo = {
		fileName,
		size,
		lastModified,
	};

	const that = Object.assign({}, options);
	function getVal (code) {
		if (code in that) {
			return that[code];
		}
		try {
			return jsonParse(code);
		} catch (ex) {
			// console.error(ex);
		}
	}
	for await (const script of html.match(/<script\s+type="text\/javascript">[\s\S]+?<\/script>/ig).map(
		script => script.slice(31, -9).trim(),
	)) {
		const hostname = script.match(/(['"])(https?:\/\/(\w+\.)*lanzoug\w*(\.\w+)+\/file\/?)\1/i);
		const pathname = script.match(/(['"])(\?\S{256,})\1/);
		if (hostname && pathname) {
			console.log("发现无密码的单文件：", url.href);
			fileInfo.url = new URL(pathname[2], hostname[2]).href;
			break;
		}
		const ajaxCode = script.match(/\$.ajax\({([\s\S]+?)}\);?/);
		if (!ajaxCode) {
			continue;
		}
		script.slice(0, ajaxCode.index).split(/\r?\n/).forEach(line => {
			line = line.trim();
			if (line.startsWith("//")) {
				return;
			}
			line = line.match(/^((var|let|const)\s+)?(\w+)\s*=\s*(.*?)(;|$)/);
			if (line) {
				that[line[3]] = getVal(line[4]) || that[line[3]];
			}
		});
		const ajaxConfig = {};
		let inData;
		const data = {};
		ajaxCode[1].replace(/\s*(}\s*,?)\s*/g, "\n$1\n").replace(/(,|{)\s*/g, "$1\n").split(/\r?\n/).forEach(line => {
			line = line.trim();
			if (line.startsWith("//")) {
				return false;
			} else if (/^}\s*,?$/.test(line)) {
				inData = false;
			} else if ((line = line.match(/^(['"])?(\S+)\1\s*:\s*(.+?)\s*,?$/))) {
				const key = line[2];
				const value = line[3];
				if (key === "data") {
					inData = true;
					ajaxConfig.data = data;
				} else if (inData) {
					data[key] = getVal(value);
				} else {
					ajaxConfig[key] = getVal(value);
				}
			}
		});
		if (ajaxConfig.url && ajaxConfig.data) {
			// 有密码的单文件或者文件夹
			return getFileInfoByAjax(url, fileInfo, ajaxConfig, options);
		}
	}
	fileInfo.options = options;
	return parseFileInfo(fileInfo, url);
}

function parseFileInfo (fileInfo, url) {
	if (typeof fileInfo.size === "string") {
		const size = fileInfo.size.match(/^([+-\d.]+)\s*(\w+)?$/);
		const BIBYTE_UNITS = "BKMGTPEZY";
		const number = Number.parseFloat(size[1]);
		const exponent = BIBYTE_UNITS.indexOf(size[2][0].toUpperCase());
		if (Number.isNaN(number) || exponent < 0) {
			delete fileInfo.size;
		} else {
			fileInfo.size = Math.round(number * Math.pow(1024, exponent));
		}
	}
	if (typeof fileInfo.lastModified === "string") {
		let lastTime = fileInfo.lastModified.match(/^(\d+)\s*(.*)前$/);
		if (lastTime) {
			fileInfo.lastModified = Date.now() - (+lastTime[1] * 1000 * ({
				天: 60 * 60 * 24,
				小时: 60 * 60,
				分钟: 60,
				分: 60,
				秒钟: 1,
				秒: 1,
			}[lastTime[2]]));
		} else if ((lastTime = fileInfo.lastModified.match(/^(.*)天\s*((?:\d+:+)*\d+)/))) {
			let time = lastTime[2].split(":");
			time = Date.parse(new Date().toLocaleDateString() + ` ${time[0]}:${time[1]}:${time[2] || 0} GMT+0800`);
			time -= ({
				昨: 1,
				前: 2,
			}[lastTime[1]] || 0) * 60 * 60 * 24 * 1000;
			fileInfo.lastModified = time;
		} else {
			fileInfo.lastModified = Date.parse(fileInfo.lastModified) || fileInfo.lastModified;
		}
	}
	if (fileInfo.id) {
		fileInfo.referer = new URL("/tp/" + fileInfo.id, url.origin).href;
	} else {
		const id = getIdByUrl(url);
		fileInfo.id = id;
		fileInfo.referer = `${url.origin}/tp/${id}`;
	}

	if (fileInfo.url) {
		fileInfo.expires = Date.now() + 1800000;
	}
	storage[fileInfo.id] = fileInfo;
	return fileInfo;
}

function getIdByUrl (url) {
	return url.pathname.replace(/^(\/+tp)*\/+/, "") + url.search;
}

async function getFileInfoByAjax (url, fileInfo, ajaxConfig, options) {
	const res = await fetch(
		new URL(ajaxConfig.url, url.origin).href,
		{
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Accept": "application/json",
				"x-requested-with": "XMLHttpRequest",
				"User-Agent": userAgent,
				"Referer": url.href,
				"X-Forwarded-For": getRandomIP(),
				"client-ip": getRandomIP(),
			},
			body: new URLSearchParams(ajaxConfig.data).toString(),
			method: (ajaxConfig.type || "POST").toUpperCase(),
		},
	);
	await checkResponse(res);
	let data = await res.json();
	if (Array.isArray(data.text)) {
		console.log("发现文件夹:", url.href);
		data = data.text.map(file => parseFileInfo({
			fileName: file.name_all,
			size: file.size,
			lastModified: file.time,
			id: file.id,
		}, url));
		storage[getIdByUrl(url)] = data.map(dada => dada.id);
	} else if (data.url && data.inf && data.dom) {
		console.log("发现需要密码的单文件:", url.href);
		fileInfo.fileName = data.inf;
		fileInfo.url = new URL(data.url, new URL("/file/", data.dom)).href;
		fileInfo.options = options;
		data = parseFileInfo(fileInfo, url);
	} else {
		// 除非网络异常，否则大概里是密码错了
		throw new Error(data.info || data);
	}
	return data;
}

// function reqFileInfoByWeb (url) {
// 	const web = webView({
// 		url: url.href,
// 		userAgent: uaMobile,
// 	});
// 	return web.ready(
// 		() => document.documentElement.innerHTML,
// 	).then(html => getFileInfo(url, html, (ajaxInfo) => web.evaluate(
// 		ajaxInfo => fetch(ajaxInfo.url, {
// 			headers: {
// 				"Accept": "application/json",
// 				"Content-Type": "application/x-www-form-urlencoded",
// 				"x-requested-with": "XMLHttpRequest",
// 			},
// 			body: new URLSearchParams(ajaxInfo.data).toString(),
// 			method: ajaxInfo.type,
// 		}).then(response => response.json()),
// 		[ajaxInfo],
// 	), "WebView: ")).finally(() => web.cancel);
// };

function getFileInfo (url, options) {
	url = parseUrl(url);
	const id = getIdByUrl(url);
	const fileInfo = storage[id];
	if (fileInfo) {
		if (Array.isArray(fileInfo)) {
			return getFileInfoFromUrl(url, options).catch(ex => {
				return fileInfo.map(id => storage[id]);
			});
		} else {
			if (!options.reqUrl || (fileInfo.url && fileInfo.expires > Date.now())) {
				return Promise.resolve(fileInfo);
			}
			if (fileInfo.options) {
				options = Object.assign(fileInfo.options, options);
			}
		}
	}
	return getFileInfoFromUrl(url, options);
}

async function getRealFile (fileInfo, redirect) {
	const cache = realFileCache[fileInfo.id];
	const now = Date.now();
	if (cache) {
		if (cache.expires && now >= cache.expires) {
			// console.log("命中缓存，但已过期:", fileInfo);
			delete realFileCache[fileInfo.id];
		} else {
			// console.log("命中缓存:", fileInfo);
			return Promise.resolve(cache);
		}
	}
	if (fileInfo.url && fileInfo.expires > now) {
		const res = await fetch(fileInfo.url, {
			method: "HEAD",
			redirect: redirect ? "follow" : "manual",
			// redirect: "error",
			headers: {
				"Accept": "text/html",
				"Accept-Encoding": "gzip, deflate, br",
				"Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
				// "Cache-Control": "no-cache",
				// "Connection": "keep-alive",
				// "Pragma": "no-cache",
				"Upgrade-Insecure-Requests": 1,
				"Cookie": "down_ip=1",
				"User-Agent": userAgent,
				"Referer": fileInfo.url,
				"X-Forwarded-For": getRandomIP(),
				"client-ip": getRandomIP(),
			},
			referrer: fileInfo.url,
		});
		const location = res.headers.get("location");
		if (location) {
			fileInfo.location = location;
		} else {
			await checkResponse(res);
		}
		let disposition = res.headers.get("content-disposition");
		if (disposition) {
			disposition = disposition && disposition.match(/(^|;)\s*filename\*?\s*=\s*(UTF-8(''|\/))?(.*?)(;|\s|$)/i);
			disposition = disposition && decodeURI(disposition[4]);
			fileInfo.fileName = disposition || fileInfo.fileName;
			fileInfo.location = location || res.url;
			const expires = res.headers.get("expires");
			if (expires) {
				fileInfo.expires = Date.parse(expires);
			}
			const type = res.headers.get("Content-Type");
			if (type && !/^application\/octet-stream$/i.test(type)) {
				fileInfo.type = type;
			}
			const size = +res.headers.get("content-length");
			if (size) {
				fileInfo.size = size;
			}
			const lastModified = res.headers.get("last-modified");
			if (lastModified) {
				fileInfo.lastModified = Date.parse(lastModified);
			}
		}
		if (fileInfo.location) {
			realFileCache[fileInfo.id] = fileInfo;
			return fileInfo;
		} else {
			throw new Error("unknow error: \nat " + res.url);
		}
	}
	if (fileInfo.referer) {
		return getRealFile(await getFileInfo(fileInfo.referer, {
			reqUrl: true,
		}));
	}
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

class FileInfo {
	constructor (data) {
		Object.assign(this, data);
	}

	async getLocation (redirect) {
		const data = await getRealFile(this, redirect);
		Object.assign(this, data);
		return this;
	}
}

async function parse (url, options) {
	const data = await getFileInfo(url, options || {});
	if (Array.isArray(data)) {
		return data.map(data => new FileInfo(data));
	}
	return new FileInfo(data);
}
module.exports = parse;
// (async () => {
// 	let file = await parse("https://423down.lanzouv.com/tp/iKBGf0hcsq5e");
// 	console.log(file.url);
// 	file = await parse("https://423down.lanzouv.com/tp/iKBGf0hcsq5e");
// 	console.log(file.url);
// })();
