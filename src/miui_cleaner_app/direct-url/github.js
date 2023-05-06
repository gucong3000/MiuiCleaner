const Browser = require("./RemoteFile");

class RemoteFile extends Browser.RemoteFile {
	async getLocation (redirect) {
		const file = this;
		if (file.location && !redirect) {
			return file.location;
		}
		await getFileInfo(
			await file.getUrl(),
			{
				file,
				headers: {
					Accept: file.contentType || "*/*",
				},
				redirect,
				method: "HEAD",
			},
		);
		return file.location;
	}
}

function parseHTML () {

}

function parseJSON (data, res) {
	if (data.assets) {
		const versionName = data.tag_name.replace(/^v_*/, "");
		return data.assets.map(
			asset => new RemoteFile({
				id: asset.node_id,
				fileName: asset.name,
				size: asset.size,
				lastModified: Date.parse(asset.updated_at),
				contentType: asset.content_type,
				url: asset.browser_download_url,
				referrer: data.html_url,
				versionName,
				browser: this,
				release: data,
			}),
		);
	}
}

const browser = new Browser(
	parseHTML,
	parseJSON,
);

browser.RemoteFile = RemoteFile;

async function getFastUrl (browser, urlList, options = {}) {
	const controller = new AbortController();
	options = {
		signal: controller.signal,
		method: "HEAD",
		...options,
	};
	const file = await Promise.any(
		urlList.map(
			url => browser.fetch(url, options),
		),
	);
	controller.abort();
	return file;
}

async function getFastAsset (browser, url, options) {
	const urlList = [
		"github.com",
		// https://doc.fastgit.org/zh-cn/guide.html#release-和源码存档的下载
		"download.fastgit.org",
		// https://github.com/fhefh2015/Fast-GitHub/issues/44
		"gh.api.99988866.xyz",
		"gh.con.sh",
		"gh.ddlc.top",
		"gh2.yanqishui.work",
		"ghproxy.com",
		"ghps.cc",
		"git.xfj0.cn",
		"github.91chi.fun",
		"proxy.zyun.vip",
	].map(
		host => `${url.protocol}//${host}${url.pathname}`,
	);
	const file = await getFastUrl(
		browser,
		urlList,
		options,
	);
	if (!file.url) {
		file.url = urlList[0];
	}
	return file;
}

async function getFastRaw (browser, url, options) {
	const urlList = [
		"githubusercontent.com",
		// https://doc.fastgit.org/zh-cn/guide.html#对于-raw-的代理
		"fastgit.org",
		// https://gitmirror.com/raw.html
		"gitmirror.com",
	].map(host => `${url.protocol}//raw.${host}${url.pathname}`);
	urlList.unshift(
		url.protocol + "//cdn.jsdelivr.net/gh" + url.pathname.replace(/^(\/.*?\/.*?)\//, "$1@"),
	);
	const file = await getFastUrl(
		browser,
		urlList,
		options,
	);
	if (!file.url) {
		file.url = urlList[1];
	}
	return file;
}

function getFileInfo (url, options) {
	url = url.hostname
		? url
		: new URL(url);

	if (!/^raw\./i.test(url.hostname) || /\bgithubusercontent\b/.test(url.hostname)) {
		const [
			,
			repo,
			action,
			path,
		] = url.pathname.match(/^(?:\/repos)?(\/.*?\/.*?)\/(.*?)(\/.*|$)/i);

		if (action === "releases") {
			if (/^\/.+?\/.+/.test(path)) {
				// release 中的文件下载
				return getFastAsset(browser, url, options);
			} else {
				// 查询 assets
				url.hostname = "api." + url.hostname;
				url.pathname = "/repos" + url.pathname;
				return browser.fetch(url);
			}
		} else {
			url.pathname = repo + path;
		}
	}
	return getFastRaw(browser, url, options);
}

module.exports = getFileInfo;
module.exports.test = hostname => /^(\w+\.)*github(usercontent)?(\.\w+)+$/.test(hostname);
