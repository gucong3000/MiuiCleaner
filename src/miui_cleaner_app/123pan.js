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

	async getUrl () {
		const file = this;
		if (file.url) {
			return file.url;
		}
		const url = await file.browser.fetch(
			new URL(
				"share/download/info",
				file.publicPath,
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
					ShareKey: file.ShareKey,
					Etag: file.Etag,
				}),
				method: "POST",
			},
		);
		// call setter defined in super
		file.url = url;
		return file.url;
	}
}

async function parseHTML (html, res) {
	let initialProps = html.match(/^\s*(window\.)?g_initialProps\s*=\s*(.*?)\s*;?\s*$/im);
	initialProps = initialProps && jsonParse(initialProps[2].trim());
	this.shareData = {
		...initialProps.res.data,
		publicPath: initialProps.publicPath,
	};
	return this.parseJSON(initialProps.reslist);
}

function parseFileData (fileList, browser) {
	if (Array.isArray(fileList)) {
		// 解析多个结果
		fileList = Promise.all(
			fileList.map(file => parseFileData(file, browser)),
		);
	} else {
		const {
			publicPath,
			ShareKey,
		} = browser.shareData;

		if (fileList.Etag || fileList.S3KeyFlag) {
			// 解析单个文件
			fileList.publicPath = publicPath;
			fileList.ShareKey = ShareKey;
		} else {
			// 解析文件夹
			fileList = browser.fetch(
				new URL(
					`share/get?limit=999&next=1&orderBy=share_id&orderDirection=desc&shareKey=${ShareKey}&ParentFileId=${fileList.FileId}&Page=1`,
					publicPath,
				),
				{
					headers: {
						Accept: "application/json",
					},
				},
			);
		}
	}
	return fileList;
}

function parseJSON (res) {
	if (!res.code && res.data) {
		if (res.data.InfoList) {
			return parseFileData(res.data.InfoList, this);
		} else if (res.data.DownloadURL) {
			return decodeURI(
				atob(
					new URL(res.data.DownloadURL).searchParams.get("params"),
				),
			);
		}
	}
	throw new Error(res.message || res);
}

function getFileInfo (url) {
	const browser = new Browser(
		parseHTML,
		parseJSON,
	);
	browser.RemoteFile = RemoteFile;
	return browser.fetch(url);
}

module.exports = getFileInfo;

// getFileInfo("https://www.123pan.com/s/A6cA-C29Jh").then(async f => {
// 	console.log(await f[0].getUrl());
// 	console.log(f[0].url);
// }).then(console.log);
