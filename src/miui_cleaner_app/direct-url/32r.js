
const Browser = require("./browser");
const jsonParse = require("json5/lib/parse");

class RemoteFile extends Browser.RemoteFile {
	async getLocation (redirect) {
		return this.location;
	}
}

const browser = new Browser(
	parseHTML,
);
browser.RemoteFile = RemoteFile;

function parseHTML (html, res) {
	const data = jsonParse(html.match(/<script type="application\/ld\+json">\s*([\s\S]+?)\s*<\/script>/)[1]);
	let versionName = data.title?.match(/\d+(\.+\d+)+/);
	versionName = versionName && versionName[0];
	return {
		lastModified: Date.parse(data.upDate || data.pubDate),
		referrer: res.url,
		versionName,
	};
}

async function getFileInfo (url) {
	let id = url.pathname.match(/^\/\w+\/(\w+?)(\.\w+)?$/i);
	if (!id) {
		return;
	}
	id = id[1];
	const file = new RemoteFile({
		id,
		url: `https://api.32r.com/downm/${id}`,
		referrer: `https://m.32r.com/app/${id}.html`,
	});
	await Promise.all([
		browser.fetch(file.referrer, {
			file,
		}),
		browser.fetch(file.url, {
			file,
			method: "HEAD",
			redirect: true,
			headers: {
				"X-Requested-With": null,
				"Accept": "*/*",
			},
		}),
	]);

	return file;
}

module.exports = getFileInfo;
module.exports.test = hostname => /^(\w+\.)*32r(\.\w+)+$/.test(hostname);
