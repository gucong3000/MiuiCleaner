const jsonParse = require("json5/lib/parse");
const Browser = require("./RemoteFile");

// const storage = {};
// const realFileCache = {};

async function parseHTML (html, res) {
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
	const that = Object.fromEntries(
		this.location.searchParams.entries(),
	);

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
			console.log("发现无密码的单文件：", res.url);
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
			this.fileInfo = fileInfo;
			return await this.fetch(
				new URL(ajaxConfig.url, res.url),
				{
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						"Accept": "application/json",
						"referrer": res.url,
					},
					body: new URLSearchParams(ajaxConfig.data).toString(),
					method: (ajaxConfig.type || "POST").toUpperCase(),
				},
			);
		}
	}
	return parseFileInfo(fileInfo, this.location);
}

function parseJSON (data) {
	if (Array.isArray(data.text)) {
		console.log("发现文件夹:", this.location.href);
		data = data.text.map(file => parseFileInfo({
			fileName: file.name_all,
			size: file.size,
			lastModified: file.time,
			id: file.id,
		}, this.location));
		// storage[getIdByUrl(url)] = data.map(dada => dada.id);
	} else if (data.url && data.inf && data.dom) {
		console.log("发现需要密码的单文件:", this.location.href);
		const fileInfo = this.fileInfo;
		fileInfo.fileName = data.inf;
		fileInfo.url = new URL(data.url, new URL("/file/", data.dom)).href;
		fileInfo.options = this.options;
		data = parseFileInfo(fileInfo, this.location);
	} else {
		// 除非网络异常，否则大概里是密码错了
		throw new Error(data.inf || data);
	}
	// 有密码的单文件或者文件夹
	return data;
}

function parseFileInfo (fileInfo, location) {
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
	if (!fileInfo.id) {
		fileInfo.id = location.pathname.replace(/^(\/+tp)*\/+/, "") + location.search;
	}
	fileInfo.referrer = new URL("/tp/" + fileInfo.id, location.origin).href;
	// storage[fileInfo.id] = fileInfo;
	return fileInfo;
}

function getFileInfo (url) {
	const browser = new Browser(
		parseHTML,
		parseJSON,
	);
	// browser.RemoteFile = RemoteFile;
	return browser.fetch(url);
}
module.exports = getFileInfo;

// (async () => {
// 	const file = await getFileInfo("https://zisu.lanzoum.com/tp/iI7LGwn5xjc");
// 	// console.log(file);
// 	// file.fileName = "优酷.apk";
// 	// console.log(file);
// 	await file.getLocation(true);
// 	console.log(file);
// })();
