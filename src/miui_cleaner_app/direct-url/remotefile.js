const mime = require("mime");

function parseSize (size) {
	if (Number.isInteger(size)) {
		return size;
	}
	let number = Number.parseFloat(size);
	if (number && size.match) {
		size = size.match(/\d+\s*([^\s\d]+)$/i);
		if (size) {
			size = "BKMGTPEZY".indexOf(size[1][0].toUpperCase());
			if (size < 0) {
				return;
			}
			number = Math.round(number * Math.pow(1024, size));
		} else if (!Number.isInteger(number)) {
			return;
		}
		return number;
	}
}

class RemoteFile {
	constructor (data) {
		Object.assign(this, data);
	}

	#fileName;
	get fileName () {
		let fileName = this.#fileName;
		if (fileName == null) {
			const url = this.location || this.url;
			if (url) {
				fileName = new URL(url).pathname.replace(/^.*[\\/]/, "");
				if (!/\.\w+$/.test(fileName) && this.#contentType) {
					const ext = mime.getExtension(this.#contentType);
					if (ext) {
						fileName = fileName + "." + ext;
					}
				}
			}
		}
		return fileName;
	}

	set fileName (fileName) {
		if (fileName != null) {
			this.#fileName = fileName;
		}
	}

	#contentLength;
	get contentLength () {
		return this.#contentLength;
	}

	set contentLength (value) {
		value = Number.parseInt(value);
		if (Number.isInteger(value)) {
			this.#contentLength = value;
		}
	}

	#size;
	get size () {
		return this.#contentLength || this.#size;
	}

	set size (value) {
		value = parseSize(value);
		if (Number.isInteger(value)) {
			this.#size = value;
		}
	}

	#lastModified;
	get lastModified () {
		return this.#lastModified;
	}

	set lastModified (date) {
		if (!date) {
			return;
		}
		let time = Date.parse(date);
		if (Number.isInteger(time)) {
			date = time;
		} else if (date && date.match) {
			let lastTime = date.match(/^(\d+)\s*(.*)前$/);
			if (lastTime) {
				date = Date.now() - (+lastTime[1] * 1000 * ({
					天: 60 * 60 * 24,
					小时: 60 * 60,
					分钟: 60,
					分: 60,
					秒钟: 1,
					秒: 1,
				}[lastTime[2]]));
			} else if ((lastTime = date.match(/^(.*)天\s*((?:\d+:+)*\d+)/))) {
				time = lastTime[2].split(":");
				date = new Date();
				date.setHours(+time[0] || 0);
				date.setMinutes(+time[1] || 0);
				date.setSeconds(+time[2] || 0);
				date = date.getTime() - ("今昨前".indexOf(lastTime[1]) * 60 * 60 * 24 * 1000);
			} else {
				return;
			}
			if (!Number.isInteger(date)) {
				return;
			}
		}
		this.#lastModified = date;
	}

	#expires;
	get expires () {
		return this.#expires;
	}

	set expires (date) {
		if (date) {
			date = Date.parse(date);
			if (Number.isInteger(date)) {
				this.#expires = date;
			}
		}
	}

	#contentType;
	get contentType () {
		const type = this.#contentType;
		if (!type && this.#fileName) {
			return mime.getType(this.#fileName.match(/(\.\w+)?$/, "$1")[0].slice(1));
		}
		return type;
	}

	set contentType (type) {
		if (type && !/^application\/octet-stream$/i.test(type) && /\w+\/\w+/.test(type)) {
			this.#contentType = type;
		}
	}

	#url;
	set url (url) {
		if (url) {
			this.#url = url;
		}
	}

	get url () {
		return this.#fixurl(this.#url);
	}

	#location;
	set location (url) {
		if (url) {
			this.#location = url;
		}
	}

	get location () {
		return this.#fixurl(this.#location);
	}

	#fixurl (url) {
		if (url) {
			if (this.#fileName) {
				url = url.replace(/([?&](?:fs|file)name=).*?(&|$)/i, (s, prefix, suffix) => prefix + this.#fileName + suffix);
			}
			return url;
		}
	}

	// if (fileInfo.location && fileInfo.fileName) {
	// 	fileInfo.location = fileInfo.location
	// }

	async getUrl () {
		const file = this;
		if (file.url) {
			return file.url;
		}
		await file.browser.fetch(file.referrer, {
			file,
		});
		return file.url;
	}

	async getLocation (redirect) {
		let file = this;
		if (file.location && !redirect) {
			return file.location;
		}
		file = await file.browser.fetch(await file.getUrl(), {
			file,
			headers: {
				Accept: "*/*",
			},
			redirect,
			method: "HEAD",
		});
		return file.location;
	}

	#versionName;

	set versionName (versionName) {
		if (versionName) {
			this.#versionName = versionName;
		}
	}

	get versionName () {
		if (this.#versionName) {
			return this.#versionName;
		}
		let versionName;
		if (
			[
				this.fileName,
				this.path,
			].filter(Boolean).some(path => {
				versionName = path.match(/\d+(\.+\d+)+/);
				versionName = versionName && versionName[0];
				return versionName;
			})
		) {
			return versionName;
		}
	}

	#versionCode;

	set versionCode (versionCode) {
		if (Number.isInteger(versionCode)) {
			this.#versionCode = versionCode;
		}
	}

	get versionCode () {
		if (Number.isInteger(this.#versionCode)) {
			return this.#versionCode;
		}
		let versionCode;
		if (
			[
				this.fileName,
				this.path,
			].filter(Boolean).some(path => {
				versionCode = path.match(/\(\s*(\d+)\s*\)/);
				versionCode = versionCode && versionCode[1];
				return versionCode;
			})
		) {
			return +versionCode;
		}
	}

	valueOf () {
		const data = {};
		[
			"id",
			"fileName",
			"path",
			"size",
			"referrer",
			"url",
			"location",
			"contentType",
			"appName",
			"packageName",
			"versionName",
			"versionCode",
			// "browser",
			// "headers",
			// "browser",
		].concat(Object.keys(this)).forEach(key => {
			const value = this[key];
			if (value != null && !/^function|object$/.test(typeof value)) {
				data[key] = value;
			}
		});
		[
			"lastModified",
			"expires",
		].forEach(time => {
			if (this[time]) {
				data[time] = new Date(this[time]);
			}
		});
		return data;
	}
}

module.exports = RemoteFile;
