const axios = require("axios");
const regCodeValue = /^(['"]?)(.*)\1$/;
function lanzou (id, pwd) {
	if (id.length > 9) {
		return singleFile(id, pwd);
	} else {
		return multiFile(id, pwd);
	}
}

function getScript ({
	html,
	pwd,
	baseUrl,
	id,
	jsonParse,
}) {
	if (!html) {
		return;
	}
	const vals = {
		pwd,
	};
	const ajax = {};
	const data = {};
	const script = html.match(/<script\s+type="text\/javascript">([\s\S]+?)<\/script>/);
	if (!script) {
		return;
	}
	let inAjax;
	let inData;

	script[1].trim().split(/\r?\n/).some(line => {
		line = line.trim();
		if (line.startsWith("//")) {
			return false;
		}
		if (/^\$.ajax\(\s*{/.test(line)) {
			inAjax = true;
		} else if (inAjax) {
			let dataCode = line.match(/(['"])?data\1\s*:\s*{\s*(.*?)\s*(}\s*,?\s*)?$/);

			if (dataCode) {
				if (!dataCode[3]) {
					inData = true;
				}
				dataCode = dataCode[2];
				dataCode.trim().split(/\s*,\s*/).forEach(value => {
					if (!value) {
						return;
					}
					value = value.split(/\s*:\s*/);
					const key = value[0].replace(regCodeValue, "$2");
					value = value[1].match(regCodeValue);
					if (value[1]) {
						value = value[2];
					} else if (vals[value[2]]) {
						value = vals[value[2]];
					} else if (isFinite(value[2])) {
						value = Number(value[2]);
					} else {
						return;
					}
					data[key] = value;
				});
			} else if (/^}\s*,$/.test(line)) {
				if (inAjax && inData) {
					inData = false;
				}
			} else if (/^}\);?$/.test(line)) {
				if (inAjax && !inData) {
					inAjax = false;
					return true;
				}
			} else {
				dataCode = line.match(/(['"])?(\S+?)\1\s*:\s*(['"])?(.*?)\3\s*[,}\r\n]/);
				if (dataCode) {
					const key = dataCode[2];
					let value = dataCode[4];
					if (!dataCode[3]) {
						if (vals[value]) {
							value = vals[value];
						} else if (isFinite(dataCode[4])) {
							value = Number(dataCode[4]);
						}
					}
					if (inData) {
						data[key] = value;
					} else {
						ajax[key] = value;
					}
				}
			}
		} else {
			const varCode = line.match(/^(var\s+)?(\S+)\s*=\s*(['"])?(.*?)\3;?$/);
			if (varCode) {
				if (varCode[3]) {
					vals[varCode[2]] = varCode[4];
				} else if (isFinite(varCode[4])) {
					vals[varCode[2]] = Number(varCode[4]);
				}
			}
		}
		return false;
	});

	if (ajax.url) {
		return axios({
			headers: {
				"Referer": baseUrl,
				"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
				"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25",
				"X-Requested-With": "XMLHttpRequest",
			},
			...ajax,
			method: ajax.type,
			url: new URL(ajax.url, baseUrl).href,
			data: new URLSearchParams(data).toString(),
		}).then(res => jsonParse(res.data));
	} else {
		let fileName = html.match(/\bclass="md">\s*(.*?)\s*<\/?\w+/) || html.match(/<title>(.*?)(\s+-\s+\S+)*\s*<\/title>/);
		fileName = fileName && fileName[1];
		let hostname;
		let pathname;
		if (
			Object.keys(vals).some(value => {
				value = vals[value];
				if (/^\w+:\/\//.test(value)) {
					hostname = value;
				} else if (/^\?/.test(value)) {
					pathname = value;
				}
				return hostname && pathname;
			})
		) {
			return {
				fileName,
				url: new URL(pathname, hostname).href,
			};
		} else {
			return [{
				fileName,
				id,
			}];
		}
	}
}

// function randomIP () {
// 	return Math.floor(Math.random() * 255) + "." +
//            Math.floor(Math.random() * 255) + "." +
//            Math.floor(Math.random() * 255) + "." +
//            Math.floor(Math.random() * 255);
// }

function getRedirect ({
	referer,
	url,
	id,
}) {
	return axios.get(url, {
		maxRedirects: 0,
		headers: {
			"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
			"Accept-Encoding": "gzip, deflate",
			"Accept-Language": "zh-CN,zh;q=0.9",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
			"Pragma": "no-cache",
			"Upgrade-Insecure-Requests": "1",
			// "Referer": referer || `https://www.lanzoux.com/${id}`,
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
			// "X-Forwarded-For": randomIP(),
		},
	}).catch(res => res.response?.headers?.location || res);
}

function singleFile (id, pwd) {
	return Promise.any(
		["x", "i"].map(c => axios.get(
			`https://www.lanzou${c}.com/tp/${id}`,
			{
				headers: {
					"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
					"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
					"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25",
				},
			},
		)),
	).then(
		res => (
			getScript({
				html: res.data,
				pwd,
				baseUrl: res.request.res.responseUrl,
				id,
				jsonParse: data => ({
					fileName: data.inf,
					url: new URL(data.url, new URL("/file/", data.dom)).href,
				}),
			})
		),
	);
}

function multiFile (id, pwd) {
	return Promise.any(
		["x", "i"].map(c => axios.get(
			`https://www.lanzou${c}.com/${id}`,
			{
				headers: {
					"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
					"Referer": `https://www.lanzou${c}.com`,
					"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
					"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25",
				},
			},
		)),
	).then(
		res => (
			getScript({
				html: res.data,
				pwd,
				baseUrl: res.request.res.responseUrl,
				id,
				jsonParse: data => (
					Array.isArray(data.text) &&
					data.text.map(file => ({
						fileName: file.name_all,
						id: file.id,
					}))
				),
			})
		),
	);
}

// 单文件，无密码
// singleFile("ifkeP0evxadc").then(getRedirect).then(console.log, console.error);
// singleFile("iI7LGwn5xjc").then(console.log);
// multiFile("iHmmD06tw9xa").then(console.log);
// 单文件，有密码
singleFile("i7tit9c", "6svq").then(getRedirect).then(console.log, console.error);
// 文件夹，有密码
// multiFile("b00vs5efe", "375m").then(console.log);
// multiFile("b00vf92jc", "647w").then(console.log);
// multiFile("b03pbkhif", "miui").then(console.log);
// 文件夹，无密码
// multiFile("b0f2uzq2b").then(console.log);
// https://gucong.lanzoub.com/b03pbkhif?pwd=miui
// "https://firepx.lanzoul.com/b00vs5efe#pwd=375m",
// "https://wwm.lanzouj.com/idzsf0bh062h",
// "https://firepx.lanzoul.com/b00vf92jc#pwd=647w",
// "https://423down.lanzouv.com/b0f24av5i",
// "https://zisu.lanzoum.com/iI7LGwn5xjc",
// "https://423down.lanzouv.com/b0f1d7s2h",
// "https://423down.lanzouo.com/b0f2lkafe",
// "https://423down.lanzouv.com/b0f1gksne",
// "https://423down.lanzouv.com/b0f1avpib",
// "https://423down.lanzouv.com/b0f1b6q8d",
// "https://423down.lanzouv.com/b0f2uzq2b",
// "https://423down.lanzouv.com/iHmmD06tw9xa",
