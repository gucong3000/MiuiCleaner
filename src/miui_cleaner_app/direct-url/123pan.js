const Browser = require("./browser");
const jsonParse = require("json5/lib/parse");

class RemoteFile extends Browser.RemoteFile {
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
					Etag: file.etag,
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
				return {
					id: file.FileId,
					fileName: file.FileName,
					size: file.Size,
					lastModified: file.UpdateAt,
					url: file.DownloadUrl,
					contentType: file.ContentType,
					etag: file.Etag,
					S3KeyFlag: file.S3KeyFlag,
					ParentFileId: file.ParentFileId,
					// ...file,
				};
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
	return browser.fetch(url);
}

module.exports = getFileInfo;
module.exports.test = hostname => /^(\w+\.)*123pan(\.\w+)+$/.test(hostname);
