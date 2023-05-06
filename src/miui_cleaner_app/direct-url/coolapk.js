
const Browser = require("./RemoteFile");

const browser = new Browser(
	parseHTML,
);

function parseHTML (html, res) {
	function search (reg, code = html) {
		const result = code.match(reg);
		return result && result[1];
	}
	const appName = search(/\bclass="detail_app_title"[^<>]*>\s*(.+?)\s*<\/?\w+/);
	const versionName = search(/\bclass="list_app_info"[^<>]*>\s*(.+?)\s*<\/?\w+/);
	const packageName = search(/[&?](?:apkname|pn)=(.*?)["&]/);
	const url = search(/"(https?:\/\/dl\.coolapk\.com\/down\?.*?)"/);
	const file = {
		id: search(/[&?]id=(.*?)["&]/, url),
		fileName: `${appName}_v${versionName}.apk`,
		size: search(/\bclass="apk_topba_message"[^<>]*>[\s\r\n]*(.+?)\s\//),
		lastModified: search(/更新时间[:：]\s*(.*?)(<|$)/m),
		referrer: res.url,
		url,
		appName,
		versionName,
		packageName,
	};
	return file;
}

function getFileInfo (url) {
	return browser.fetch(url);
}

module.exports = getFileInfo;
module.exports.test = hostname => /^(\w+\.)*coolapk(\.\w+)+$/.test(hostname);
