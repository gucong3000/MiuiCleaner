const request = require("./http");
const lanzou = require("./lanzou");
// const downFile = require("./downFile");

function parseGithubRelease (url) {
	const pathInfo = url.pathname.match(/\/releases\/(.+)$/);
	if (!pathInfo) {
		return;
	}
	if (pathInfo[1].includes("/")) {
		return request(
			[
				url.href,
				url.protocol + "//gh.api.99988866.xyz/" + url.href,
				url.protocol + "//download.fastgit.org" + url.pathname + url.search,
			],
			{
				method: "HEAD",
			},
		);
	} else {
		url.hostname = "api." + url.hostname;
		url.pathname = "/repos" + url.pathname;
		return request(url.href).then(res => res.json()).then(release => {
			const referer = release.html_url;
			const versionName = release.tag_name.replace(/^v/, "");

			return release.assets.map(
				asset => ({
					fileName: asset.name,
					mimeType: asset.content_type,
					size: asset.size,
					date: Date.parse(asset.updated_at),
					id: asset.node_id,
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
	const appUrl = `https://m.32r.com/downapp/${id}`;
	let html;
	let res = {};
	return Promise.all([
		request(
			appUrl,
			{
				method: "HEAD",
				headers: {
					Referer: htmlUrl,
				},
			},
		).then(data => {
			res = data;
		}, console.error),
		request(
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
		console.log(res.headers?.get("Content-type"));
		let versionName = json.title?.match(/\d+(\.+\d+)+/);
		versionName = versionName && versionName[0];
		return {
			fileName: res.url && files.getName(new URL(res.url).pathname).replace(/_\d+(?=\.\w+$)/i, ""),
			size: +res.headers?.get("Content-Length"),
			date: Date.parse(res.headers?.get("Last-Modified") || json.upDate || json.pubDate),
			id,
			url: res.url || appUrl,
			referer: htmlUrl,
			versionName,
		};
	});
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
	} else if (/^(\w+\.)*lanzou\w*(\.\w+)*$/.test(url.hostname)) {
		console.log("正在解析网盘", url.href);
		return lanzou(url);
	}
}

function createFnCache (fn, cache = {}) {
	return (url) => {
		const key = encodeURI(url);
		const result = cache[key];
		if (result) {
			return Promise.resolve(result);
		}
		return fn(url).then(result => {
			cache[key] = result;
			return result;
		}).catch(console.error);
	};
}

module.exports = createFnCache(getRemoteFileInfo);
// module.exports = getRemoteFileInfo;

if (DEBUG) {
	require("./test/getRemoteFileInfo")(module.exports);
}
