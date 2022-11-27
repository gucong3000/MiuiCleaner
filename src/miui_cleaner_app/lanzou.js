const request = require("./http");
const webView = require("./webView");
const uaMobile = "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1";
// const UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36";
// storages.remove("lanzou");
// storage.remove("iI7LGwn5xjc");
const storage = storages.create("lanzou");

function getInfoFromHtml (url, html) {
	let fileName = html.match(/\bclass="(md|appname)"[^<>]*>\s*(.+?)\s*<\/?\w+/);
	fileName = fileName && fileName[2];
	let size = html.match(/\b(id|class)="(submit|mtt)"[^<>]*>.*?\(\s*(\d+.*?)\s*\)\s*<\/?\w+/);
	size = size && size[3];
	let date = html.match(/\bclass="appinfotime"[^<>]*>\s*(.+?)\s*<\/?\w+/);
	if (date) {
		date = date[1];
	} else {
		date = html.match(/\bclass="mt2"[^<>]*>\s*(时间.*?)?\s*<\/\w+>\s*(.*?)\s*</);
		date = date && date[2];
	}
	const fileInfo = {
		fileName,
		size,
		date,
	};
	let ajaxInfo;

	const that = {};
	url.hash.replace(/^#+/, "").split(/\s*&\s*/g).forEach(
		value => {
			value = value.split(/\s*=\s*/g);
			that[value[0]] = value[1];
		},
	);

	html.match(/<script\s+type="text\/javascript">[\s\S]+?<\/script>/ig).map(
		script => script.slice(31, -9).trim(),
	).some(script => {
		const hostname = script.match(/(['"])(https?:\/\/(\w+\.)*lanzoug\w*(\.\w+)+\/file\/?)\1/i);
		const pathname = script.match(/(['"])(\?\S{256,})\1/);
		if (hostname && pathname) {
			// 单文件，无密码
			fileInfo.url = new URL(pathname[2], hostname[2]).href;
			return true;
		}
		const ajaxCode = script.match(/\$.ajax\({([\s\S]+?)}\);?/);
		if (!ajaxCode) {
			return false;
		}

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
			ajaxInfo = ajaxConfig;
			return true;
		}
		return false;
	});

	return {
		fileInfo,
		ajaxInfo,
	};
}

function parseJsonReslut (url, data, fileInfo) {
	if (Array.isArray(data.text)) {
		data = data.text.map(file => ({
			fileName: file.name_all,
			size: file.size,
			date: file.time,
			id: file.id,
			referer: new URL("/tp/" + file.id, url.origin).href,
		}));
		return data;
	} else if (data.url && data.inf && data.dom) {
		data = Object.assign(
			fileInfo,
			{
				fileName: data.inf,
				url: new URL(data.url, new URL("/file/", data.dom)).href,
			},
		);
	} else {
		throw new Error(data.info || data);
	}
	return data;
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
	if (typeof fileInfo.date === "string") {
		const day = fileInfo.date.match(/^(\d+)\s*天前$/);
		if (day) {
			fileInfo.date = Date.now() - (+day[1] * 60 * 60 * 24 * 1000);
		} else {
			fileInfo.date = Date.parse(fileInfo.date) || fileInfo.date;
		}
	}
	const miuiInst = fileInfo.fileName.match(/(应用包管理组件).*?([\d.]+)-(\d+).*?(\.\w+)$/);
	if (miuiInst) {
		const appName = miuiInst[1];
		const versionCode = Number.parseInt(miuiInst[2].replace(/\./g, ""), 10);
		const buildID = miuiInst[3];
		const extName = miuiInst[3];
		const versionName = `${Array.from(String(versionCode)).join(".")}-${buildID}`;
		fileInfo.fileName = `${appName}_v${versionName}${extName}`;
		fileInfo.versionName = versionName;
		fileInfo.versionCode = versionCode;
	} else {
		const versionName = fileInfo.fileName.match(/\d+(\.+\d+)+/);
		if (versionName) {
			fileInfo.versionName = versionName[0];
		}
		const versionCode = fileInfo.fileName.match(/\(\s*(\d+)\s*\)/);
		if (versionCode) {
			fileInfo.versionCode = +versionCode[1];
		}
	}
	if (url) {
		const id = url.pathname.replace(/^(\/+tp)*\/+/, "") + url.search;
		fileInfo.id = id;
		fileInfo.referer = `${url.origin}/tp/${id}`;
	}
	return fileInfo;
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

function getFileInfo (url, html, fetch, label) {
	const {
		fileInfo,
		ajaxInfo,
	} = getInfoFromHtml(url, html);
	let result;
	if (ajaxInfo) {
		result = fetch(ajaxInfo).then(data => {
			return parseJsonReslut(url, data, fileInfo);
		});
	} else {
		result = Promise.resolve(fileInfo);
	}
	return result.then(fileInfo => {
		if (Array.isArray(fileInfo)) {
			fileInfo = fileInfo.map(
				file => parseFileInfo(file),
			);
			storage.put(url.pathname.slice(1), fileInfo.map(fileInfo => fileInfo.id));
		} else {
			fileInfo = parseFileInfo(fileInfo, url);
			storage.put(fileInfo.id, fileInfo);
		}
		return fileInfo;
	});
}
function reqFileInfoByHttp (url) {
	return request(
		url.href,
		{
			headers: {
				"accept": "text/html",
				"user-agent": uaMobile,
				"x-forwarded-for": getRandomIP(),
				"client-ip": getRandomIP(),
			},
		},
	).then(res => res.text()).then(html => getFileInfo(url, html, (ajaxInfo) => request(
		new URL(ajaxInfo.url, url.origin).href,
		{
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				"accept": "application/json",
				"x-requested-with": "XMLHttpRequest",
				"user-agent": uaMobile,
				"referer": url.href,
				"x-forwarded-for": getRandomIP(),
				"client-ip": getRandomIP(),
			},
			body: new URLSearchParams(ajaxInfo.data).toString(),
			method: ajaxInfo.type,
		},
	).then(res => res.json()), "HTTP: "));
}
function reqFileInfoByWeb (url) {
	const web = webView({
		url: url.href,
		userAgent: uaMobile,
	});
	return web.ready(
		() => document.documentElement.innerHTML,
	).then(html => getFileInfo(url, html, (ajaxInfo) => web.evaluate(
		ajaxInfo => fetch(ajaxInfo.url, {
			headers: {
				"accept": "application/json",
				"content-type": "application/x-www-form-urlencoded",
				"x-requested-with": "XMLHttpRequest",
			},
			body: new URLSearchParams(ajaxInfo.data).toString(),
			method: ajaxInfo.type,
		}).then(response => response.json()),
		[ajaxInfo],
	), "WebView: ")).finally(() => web.cancel);
};

function reqFileInfoWithCache (url) {
	const fileInfo = storage.get(url.pathname.replace(/^(\/tp)*\/+/i, ""));
	if (fileInfo) {
		if (Array.isArray(fileInfo)) {
			return reqFileInfo(url).catch(ex => {
				console.error(ex);
				return fileInfo.map(file => {
					file = storage.get(file);
					delete fileInfo.url;
					return file;
				});
			});
		} else {
			delete fileInfo.url;
			return Promise.resolve(fileInfo);
		}
	} else {
		return reqFileInfo(url);
	}
}

function reqFileInfo (url) {
	return Promise.any([
		reqFileInfoByHttp(url),
		reqFileInfoByWeb(url),
	]);
}
module.exports = reqFileInfoByHttp;

// 单文件，无密码
// singleFile("ifkeP0evxadc").then(getRedirect).then(console.log, console.error);
// singleFile("iI7LGwn5xjc").then(console.log);
// multiFile("iHmmD06tw9xa").then(console.log);
// 单文件，有密码
// singleFile("i7tit9c", "6svq").then(getRedirect).then(console.log, console.error);
// 文件夹，有密码
// multiFile("b00vs5efe", "375m").then(console.log);
// multiFile("b00vf92jc", "647w").then(console.log);
// multiFile("b03pbkhif", "miui").then(console.log);
// 文件夹，无密码
// multiFile("b0f2uzq2b").then(console.log);
// https://gucong.lanzoub.com/b03pbkhif?pwd=miui
// "https://firepx.lanzoul.com/b00vs5efe#pwd=375m",
// "https://wwm.lanzouj.com/idzsf0bh062h",
// "https://firepx.lanzoul.com/b00vf92jc#pwd=647w",
// "https://423down.lanzouv.com/b0f24av5i",
// "https://zisu.lanzoum.com/iI7LGwn5xjc",
// "https://423down.lanzouv.com/b0f1d7s2h",
// "https://423down.lanzouo.com/b0f2lkafe",
// "https://423down.lanzouv.com/b0f1gksne",
// "https://423down.lanzouv.com/b0f1avpib",
// "https://423down.lanzouv.com/b0f1b6q8d",
// "https://423down.lanzouv.com/b0f2uzq2b",
// "https://423down.lanzouv.com/iHmmD06tw9xa",
