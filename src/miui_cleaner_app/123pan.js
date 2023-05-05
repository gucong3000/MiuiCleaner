const Browser = require("./RemoteFile");
const atob = global.atob || global.$base64.decode;
const jsonParse = require("json5/lib/parse");

class RemoteFile extends Browser.RemoteFile {
	/* eslint accessor-pairs: off */

	set FileId (value) {
		this.id = value;
	}

	set FileName (value) {
		this.fileName = value;
	}

	set Size (value) {
		this.size = value;
	}

	set UpdateAt (value) {
		this.lastModified = value;
	}

	set DownloadUrl (value) {
		this.url = value;
	}

	set ContentType (value) {
		this.contentType = value;
	}

	get path () {
		let file = this;
		const path = [];
		while (file && file.ParentFileId) {
			const parent = this.browser.dirCache[file.ParentFileId];
			if (parent) {
				path.unshift(parent.FileName);
			}
			file = parent;
		}
		return path.join("/");
	}

	async getUrl () {
		const file = this;
		if (file.url) {
			return file.url;
		}
		file.url = await file.browser.fetch(
			new URL(
				"share/download/info",
				file.browser.shareData.publicPath,
			),
			{
				headers: {
					"Accept": "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					FileID: file.id,
					Size: file.size,
					S3keyFlag: file.S3KeyFlag,
					ShareKey: file.browser.shareData.ShareKey,
					Etag: file.Etag,
				}),
				method: "POST",
			},
		);
		return file.url;
	}
}

function parseHTML (html, res) {
	let data = html.match(/^\s*(window\.)?g_initialProps\s*=\s*(.*?)\s*;?\s*$/im);
	data = data && jsonParse(data[2].trim());
	data = data && this.parseJSON(data, res);
	if (!data) {
		throw new Error(html);
	}
	this.shareData = data;
	if (data.HasPwd) {
		return this.parseDir({
			FileId: 0,
		});
	}
	if (data.reslist) {
		return this.parseJSON(data.reslist, res);
	}
}

function parseDir (dir) {
	return this.fetch(
		new URL(
			`share/get?limit=999&next=1&orderBy=share_id&orderDirection=desc&shareKey=${this.shareData.ShareKey}${this.location.hash.replace(/^#?(.*)$/, "&$1&")}&ParentFileId=${dir.FileId || 0}&Page=1`,
			this.shareData.publicPath,
		),
		{
			headers: {
				Accept: "application/json",
			},
		},
	);
}

async function parseFileList (fileList) {
	fileList = await Promise.all(
		fileList.map(file => {
			if (file.Etag || file.S3KeyFlag) {
				return file;
			} else {
				this.dirCache[file.FileId] = file;
				return this.parseDir(file);
			}
		}),
	);
	return fileList.flat();
}

function parseJSON (resData, res) {
	if (resData.data) {
		if (resData.data.InfoList) {
			return this.parseFileList(resData.data.InfoList);
		} else if (resData.data.DownloadURL) {
			return decodeURI(
				atob(
					new URL(resData.data.DownloadURL).searchParams.get("params"),
				),
			);
		} else {
			return resData.data;
		}
	}
	if (resData.res) {
		return {
			reslist: resData.reslist,
			publicPath: resData.publicPath,
			...this.parseJSON(resData.res, res),
		};
	}
	throw new Error([
		resData.message,
		res.url,
		JSON.stringify(resData, 0, "\t"),
	].filter(Boolean).join("\n"));
}

function getFileInfo (url) {
	const browser = new Browser(
		parseHTML,
		parseJSON,
	);
	browser.RemoteFile = RemoteFile;
	browser.parseFileList = parseFileList;
	browser.parseDir = parseDir;
	browser.dirCache = {};
	// console.time("net");
	return browser.fetch(url);
	// console.timeEnd("net");
	// console.log(Object.keys(browser.dirCache).length);
	// return file;
}

module.exports = getFileInfo;

// getFileInfo("https://www.123pan.com/s/A6cA-C29Jh").then(async f => {
// 	console.log(f.flat(99).map(f => f.path));
// 	return f[0];
// }).then(console.log);

// getFileInfo("https://www.123pan.com/s/OZe0Vv-5oul3#SharePwd=K4fl").then(async f => {
// console.log(await f[0].getUrl());
// 	console.log(f.flat(99).map(f => f.path));
// }).then(console.log);

// getFileInfo("https://www.123pan.com/s/s1luVv-LbkXv").then(async f => {
// 	console.log(await f[0].getUrl());
// 	console.log(await f[0]);
// 	// console.log(f);
// 	return f;
// });
