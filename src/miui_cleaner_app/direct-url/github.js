const Browser = require("./browser");

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

function parseJSON (data, res) {
	if (data.assets && /^https?:\/\/api\./i.test(res.url)) {
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
	return data;
}

const browser = new Browser(
	null,
	parseJSON,
);

browser.RemoteFile = RemoteFile;

async function getFastUrl (urlList, options = {}) {
	const controller = new AbortController();
	options = {
		signal: controller.signal,
		method: "HEAD",
		...options,
	};
	const file = await Promise.any(urlList.map(async url => {
		const file = await browser.fetch(url, options);
		if ((file instanceof RemoteFile) && !file.url) {
			file.url = url;
		}
		return file;
	}));
	controller.abort();
	return file;
}

async function getFastDownUrl (url, options) {
	return getFastUrl(
		[
			"github.com",
			// https://doc.fastgit.org/zh-cn/guide.html#release-和源码存档的下载
			"download.fastgit.org",
		].map(
			host => `${url.protocol}//${host}${url.pathname}`,
		).concat(
			[
				// https://github.com/fhefh2015/Fast-GitHub/issues/44
				"ghproxy.com",
				"hub.gitmirror.com",
				"gh.api.99988866.xyz",
				// "gh.con.sh",
				// "gh.ddlc.top",
				// "gh2.yanqishui.work",
				// "ghps.cc",
				// "git.xfj0.cn",
				// "github.91chi.fun",
				// "proxy.zyun.vip",
			].map(host => `${url.protocol}//${host}/${url.href}`),
		),
		options,
	);
}

async function getFastSourceUrl (url, options) {
	return getFastUrl(
		[
			// https://www.jsdelivr.com/?docs=gh
			`${url.protocol}//fastly.jsdelivr.net/gh${url.pathname.replace(/^(\/.*?\/.*?)\//, "$1@")}`,
			// https://gitmirror.com/cdn.html
			`${url.protocol}//cdn.gitmirror.com/gh${url.pathname}`,
			`${url.protocol}//ghproxy.com/${url.href}`,
		].concat(
			[
				"githubusercontent.com",
				// https://gitmirror.com/raw.html
				"gitmirror.com",
				// https://doc.fastgit.org/zh-cn/guide.html#对于-raw-的代理
				"fastgit.org",
			].map(host => `${url.protocol}//raw.${host}${url.pathname}`),
		),
		options,
	);
}

function getFileInfo (url, options) {
	url = url.hostname
		? url
		: new URL(url);

	if (!/^raw\./i.test(url.hostname)) {
		const [
			,
			repo,
			action,
			path,
		] = url.pathname.match(/^(?:\/repos)?(\/.*?\/.*?)\/(.*?)(\/.*|$)/i);

		switch (action) {
			case "releases": {
				if (/\/download\//i.test(path)) {
					// release 中的文件下载
					return getFastDownUrl(url, options);
				} else {
					// 查询 assets
					url.hostname = "api." + url.hostname;
					url.pathname = "/repos" + url.pathname;
					return browser.fetch(url, options);
				}
			}
			case "archive": {
				return getFastDownUrl(url, options);
			}
			// https://github.com/ineo6/hosts/master/template.md
			// https://github.com/ineo6/hosts/master/template.md
			// case "blob":
			// case "raw":
			default: {
				url.pathname = repo + path;
			}
		}
	}
	return getFastSourceUrl(url, options);
}

module.exports = getFileInfo;
module.exports.test = hostname => /^(\w+\.)*github(usercontent)?(\.\w+)+$/.test(hostname);
