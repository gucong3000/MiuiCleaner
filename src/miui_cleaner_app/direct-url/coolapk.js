
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
// getFileInfo("https://www.coolapk.com/apk/com.miui.gaojishezhi.plus").then((fileList) => {
// 	console.log(fileList);
// 	// return fileList.getLocation(true);
// }).then(file => {
// 	// console.log(file);
// });
// getFileInfo("https://www.coolapk.com/apk/com.miui.gaojishezhi.plus").then(f => f.getLocation(1)).then(console.log);
// getFileInfo("https://www.coolapk.com/apk/com.joe.holi").then(f => f.getLocation(1)).then(console.log);
// location: 'http://113.249.230.43:49155/imtt.dd.qq.com/16891/apk/8421C517FFBF256E016AB262AEA08549.apk?mkey=644b7712df5d26827382e0fc2be6df84&arrive_key=1286322330023&fsname=com.joe.holi_4.4.5_172.apk&csr=db5e&cip=171.213.47.106&proto=http',
