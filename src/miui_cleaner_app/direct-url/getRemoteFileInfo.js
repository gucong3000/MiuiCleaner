const fetch = require("../fetch");
const lanzou = require("./lanzou");
const coolapk = require("./coolapk");
const _123pan = require("./123pan");

class Asset {
	constructor (data) {
		Object.assign(this, data);
	}

	async getLocation () {
		const location = await parseGithubRelease(new URL(this.url), false);
		if (location) {
			this.location = location;
		}
		return this;
	}
}

function parseGithubRelease (url, redirect) {
	const pathInfo = url.pathname.match(/\/releases\/(.+)$/);
	if (!pathInfo) {
		return;
	}
	if (pathInfo[1].includes("/")) {
		return fetch(
			[
				url.href,
				url.protocol + "//gh.api.99988866.xyz/" + url.href,
				url.protocol + "//download.fastgit.org" + url.pathname + url.search,
			],
			{
				redirect: redirect ? "follow" : "manual",
				method: "HEAD",
			},
		).then(res => {
			const location = res.headers.get("location");
			if (location) {
				return location;
			} else if (res.ok) {
				return res.url;
			}
		});
	} else {
		url.hostname = "api." + url.hostname;
		url.pathname = "/repos" + url.pathname;
		return fetch(url.href).then(res => res.json()).then(release => {
			const referer = release.html_url;
			const versionName = release.tag_name.replace(/^v/, "");
			return release.assets.map(
				asset => new Asset({
					id: asset.node_id,
					fileName: asset.name,
					size: asset.size,
					lastModified: Date.parse(asset.updated_at),
					type: asset.content_type,
					url: asset.browser_download_url,
					referer,
					versionName,
				}),
			);
		});
	}
}

function parse32r (url) {
	let id = url.pathname.match(/^\/\w+\/(\w+?)(\.\w+)?$/i);
	if (!id) {
		return;
	}
	id = id[1];
	const htmlUrl = `https://m.32r.com/app/${id}.html`;
	const appUrl = `https://api.32r.com/downm/${id}`;
	let html;
	let res = {};
	return Promise.all([
		fetch(
			appUrl,
			{
				method: "HEAD",
				headers: {
					Referer: htmlUrl,
				},
				redirect: "follow",
			},
		).then(data => {
			if (data.headers?.get("Content-Type") === "application/vnd.android.package-archive") {
				res = data;
			}
		}, console.error),
		fetch(
			htmlUrl,
		).then(res => res.text()).then(data => {
			html = data;
		}, console.error),
	]).then(() => {
		let json = html && html.match(/<script type="application\/ld\+json">\s*([\s\S]+?)\s*<\/script>/);
		if (json) {
			json = JSON.parse(json[1]);
		} else {
			json = {};
		}
		let versionName = json.title?.match(/\d+(\.+\d+)+/);
		versionName = versionName && versionName[0];
		return {
			fileName: res.url && files.getName(new URL(res.url).pathname).replace(/_\d+(?=\.\w+$)/i, ""),
			size: +res.headers?.get("content-length"),
			lastModified: Date.parse(res.headers?.get("last-modified") || json.upDate || json.pubDate),
			id,
			url: res.url || appUrl,
			referer: htmlUrl,
			versionName,
		};
	});
}

function getVersionForFile (fileInfo) {
	if (Array.isArray(fileInfo)) {
		fileInfo.forEach(getVersion);
	} else {
		getVersion(fileInfo);
	}
	return fileInfo;
}

function getVersion (fileInfo) {
	const versionName = fileInfo.fileName.match(/\d+(\.+\d+)+/);
	if (versionName) {
		fileInfo.versionName = versionName[0];
	}
	const versionCode = fileInfo.fileName.match(/\(\s*(\d+)\s*\)/);
	if (versionCode) {
		fileInfo.versionCode = +versionCode[1];
	}
}

function getOptsFromUrl (url) {
	const options = {};
	url.hash.replace(/^#+/, "").split(/\s*&\s*/g).forEach(
		value => {
			value = value.split(/\s*=\s*/g);
			options[value[0]] = value[1];
		},
	);
	return options;
}

function getRemoteFileInfo (url) {
	if (!url.href) {
		url = new URL(url);
	}
	// if (/(^|\.)firepx\.com$/i.test(url.hostname)) {
	// 	return request(url.href).then(res => {
	// 		const body = res.body.string();
	// 		const link = body.match(/<a\s*\bhref="(.*?)".*密码\s*[:：]\s*(\w+)/);
	// 		if (link) {
	// 			const newUrl = new URL(link[1], url.href);
	// 			if (newUrl.hostname !== url.hostname) {
	// 				newUrl.hash = "#pwd=" + link[2];
	// 				return toDownOpts(newUrl);
	// 			}
	// 		}
	// 		return openWeb(url);
	// 	});
	// } else
	if (url.hostname === "github.com") {
		console.log("正在解析Github API", url.href);
		return parseGithubRelease(url);
	} else if (/^(\w+\.)*32r(\.\w+)*$/i.test(url.hostname)) {
		console.log("正在解析网页", url.href);
		return parse32r(url);
	} else if (/^(\w+\.)*coolapk(\.\w+)*$/i.test(url.hostname)) {
		console.log("正在解析网页", url.href);
		return coolapk(url);
	} else if (/^(\w+\.)*lanzou\w*(\.\w+)*$/.test(url.hostname)) {
		console.log("正在解析网盘", url.href);
		return lanzou(url, getOptsFromUrl(url)).then(getVersionForFile);
	} else if (/^(\w+\.)*123pan(\.\w+)*$/.test(url.hostname)) {
		console.log("正在解析网盘", url.href);
		return _123pan(url, getOptsFromUrl(url)).then(getVersionForFile);
	}
}

// function createFnCache (fn, cache = {}) {
// 	return (url) => {
// 		const key = encodeURI(url);
// 		const result = cache[key];
// 		if (result) {
// 			return Promise.resolve(result);
// 		}
// 		return fn(url).then(result => {
// 			cache[key] = result;
// 			return result;
// 		});
// 	};
// }

// module.exports = createFnCache(getRemoteFileInfo);
module.exports = getRemoteFileInfo;

if (DEBUG) {
	require("../test/getRemoteFileInfo")(module.exports);
}
