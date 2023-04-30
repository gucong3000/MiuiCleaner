const jsonParse = require("json5/lib/parse");
const fetch = global.fetch || require("./fetch");
const atob = global.atob || global.$base64.decode;

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
			},
		},
	);
	await checkResponse(res);
	const html = await res.text();
	let initialProps = html.match(/\b(window\.)?g_initialProps\s*=\s*(.*);/m);
	initialProps = initialProps && jsonParse(initialProps[2]);
	return parseFileInfo(initialProps.reslist.data.InfoList, url, initialProps);
}

async function parseFileInfo (fileInfo, url, initialProps) {
	if (Array.isArray(fileInfo)) {
		// 解析多个结果
		fileInfo = await Promise.all(fileInfo.map(fileInfo => parseFileInfo(fileInfo, url, initialProps)));
		fileInfo = fileInfo.flat();
		if (fileInfo.length === 1) {
			fileInfo = fileInfo[0];
		}
	} else if (fileInfo.Etag || fileInfo.S3KeyFlag) {
		// 解析单个文件
		fileInfo.publicPath = initialProps.publicPath;
		fileInfo.shareKey = initialProps.res.data.ShareKey;
		fileInfo = new FileInfo(fileInfo);
	} else {
		// 解析文件夹
		let res = await fetch(
			new URL(
				`share/get?limit=999&next=1&orderBy=share_id&orderDirection=desc&shareKey=${initialProps.res.data.ShareKey}&ParentFileId=${fileInfo.FileId}&Page=1`,
				initialProps.publicPath,
			).href,
			{
				headers: {
					"Accept": "application/json",
					"User-Agent": userAgent,
				},
				referrerPolicy: "no-referrer",
			},
		);
		await checkResponse(res);
		res = await res.json();
		fileInfo = await parseFileInfo(res.data.InfoList, url, initialProps);
	}
	return fileInfo;
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

class FileInfo {
	constructor (data) {
		Object.assign(this, data);
	}

	get fileName () {
		return this.FileName;
	}

	set fileName (fileName) {
		this.FileName = fileName;
	}

	get size () {
		return this.Size;
	}

	get lastModified () {
		return Date.parse(this.UpdateAt);
	}

	get id () {
		return this.FileId;
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

async function getRealFile (fileInfo, redirect) {
	let res = await fetch(
		new URL(
			"share/download/info",
			fileInfo.publicPath,
		).href,
		{
			headers: {
				"Accept": "application/json",
				"Content-Type": "application/json;charset=UTF-8",
				"User-Agent": userAgent,
			},
			body: JSON.stringify({
				ShareKey: fileInfo.shareKey,
				FileID: fileInfo.FileId,
				S3keyFlag: fileInfo.S3KeyFlag,
				Size: fileInfo.Size,
				Etag: fileInfo.Etag,
			}),
			method: "POST",
		},
	);
	await checkResponse(res);
	res = await res.json();
	fileInfo.location = decodeURI(atob(new URL(res.data.DownloadURL).searchParams.get("params"))).replace(/([?&]filename=).*?(&|$)/, (s, prefix, suffix) => prefix + fileInfo.fileName + suffix);
	// if (redirect) {
	// 	//
	// }
	return fileInfo;
}
module.exports = parse;
// getFileInfo("https://www.123pan.com/s/A6cA-C29Jh").then(f => {
// 	f[0].fileName = "a.apk";
// 	return f[0].getLocation(1);
// }).then(console.log);
