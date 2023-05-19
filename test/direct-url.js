/* eslint-disable mocha/no-setup-in-describe */
const { assert } = require("chai");
const director = require("../src/miui_cleaner_app/direct-url");
const appList = [
	{
		name: "李跳跳",
		url: "https://www.123pan.com/s/ZYAZVv-TBYjd",
	},
	{
		name: "小米浏览器",
		url: "https://wwm.lanzoul.com/tp/idzsf0bh062h",
	},
	{
		name: "讯飞输入法",
		url: "https://firepx.lanzoul.com/b00vf92jc?pwd=647w",
	},
	{
		name: "隐启设置",
		url: "https://www.coolapk.com/apk/com.miui.gaojishezhi.plus",
	},
	{
		name: "应用包管理组件",
		url: "https://zisu.lanzoum.com/tp/iI7LGwn5xjc",
	},
	{
		name: "QQ音乐简洁版",
		url: "https://wwi.lanzout.com/b046evhng?pwd=eeee",
	},
	{
		name: "酷控",
		url: "https://www.kookong.com/kk_apk.html",
	},
	{
		name: "几何天气",
		url: "https://github.com/WangDaYeeeeee/GeometricWeather/releases/latest",
	},
	{
		name: "Holi天气",
		url: "https://www.coolapk.com/apk/com.joe.holi",
	},
	{
		name: "ES文件浏览器",
		url: "https://www.123pan.com/s/A6cA-C29Jh",
	},
	{
		name: "WPS Office Lite",
		url: "https://m.32r.com/app/109976.html",
	},
	{
		name: "知乎",
		url: "https://www.123pan.com/s/A6cA-dJAJh",
	},
	{
		name: "哔哩哔哩",
		url: "https://423down.lanzouv.com/b0f1gksne",
	},
	{
		name: "优酷视频",
		url: "https://423down.lanzouv.com/b0f1avpib",
	},
	{
		name: "高德地图",
		url: "https://423down.lanzouv.com/b0f29j15c",
	},
	{
		name: "百度贴吧",
		url: "https://www.123pan.com/s/A6cA-Y89Jh",
	},
	{
		name: "酷安",
		url: "https://www.123pan.com/s/A6cA-Om9Jh",
	},
	{
		name: "App分享",
		url: "https://www.123pan.com/s/s1luVv-LbkXv",
	},
	{
		name: "MiuiCleaner asset",
		url: "https://github.com/gucong3000/MiuiCleaner/releases/latest/download/MiuiCleaner.apk",
	},
	{
		name: "MiuiCleaner releases",
		url: "https://github.com/gucong3000/MiuiCleaner/releases/latest",
	},
	{
		name: "MiuiCleaner raw",
		url: "https://raw.githubusercontent.com/JohyC/Hosts/main/MicrosoftHosts.txt",
	},
	{
		name: "MiuiCleaner archive",
		url: "https://github.com/ineo6/hosts/archive/refs/heads/master.zip",
	},
];
function sleep (delay) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, delay);
	});
}
describe("direct-url", function () {
	let cache = {};
	async function testFile (file) {
		if (file.id) {
			assert.ifError(cache[file.id], "文件 id 应该具有唯一性");
			cache[file.id] = file;
		}
		assert.match("fabar", /^foo/, "regexp matches");

		console.log(/.+\.apk$/.test(file.fileName), "文件名需为 *.apk");
		assert.match(file.fileName, /.+\.apk$/, "文件名需为 *.apk");
		file.path && assert.match(file.path, /^.+(\/.+?)*$/, "文件 path 格式");
		assert.ok(file.size && Number.isInteger(file.size), "文件 size 需为整数");
		assert.match(file.referrer, /^https?:\/\/.+/, "文件 referrer 需要为网址");
		if (file.referrer.includes("123pan")) {
			const url = await file.getUrl();
			assert.match(url, /^https?:\/\/.+\b123pan\b/, "文件 getUrl() 需要为123pan网址");
			assert.equal(url, file.url, "文件 url 需要为123pan网址");
			const location = await file.getLocation();
			assert.notEqual(url, location, "文件 getLocation() 需要和 url 不同");
			// assert.notEqual(location, await file.getLocation(true), "文件 getLocation() 需要和 getLocation(true) 不同");
		} else if (file.referrer.includes("lanzou")) {
			file.url && assert.match(file.url, /^https?:\/\/developer\.lanzou\w?\.com\/file\/\?\S+/, "文件 getUrl() 需要为https://developer.lanzoug.com/file/? ");
			await sleep(0xfff);
		} else {
			assert.match(file.url, /^https?:\/\/.+/, "文件 url 需要为网址");
		}

		file.location && assert.match(file.location, /^https?:\/\/.+/, "文件 location 需要为网址");
		file.contentType && assert.match(file.contentType, /^application\/vnd\.android\.package-archive$/, "文件 contentType 必须为 application/vnd.android.package-archive");
		file.packageName && assert.match(file.packageName, /^\w+(\.\w+)+$/, "包名格式");
		file.versionName && assert.match(file.versionName, /^\d+(\.\d+)+$/, "版本名称格式");
		file.versionCode && assert.ok(Number.isInteger(file.versionCode), "版本号码格式");
	}

	appList.forEach(appInfo => {
		it(appInfo.name + " " + appInfo.url, async function () {
			this.timeout(0);
			let file = await director(appInfo.url);
			assert.ok(file, "未获取到文件信息");

			if (Array.isArray(file)) {
				if (appInfo.filter) {
					file = appInfo.filter(file);
				} else {
					file = file.filter(file => file.fileName.endsWith(".apk"));
				}
				assert.ok(file.length, "未获取到文件信息");
				await Promise.all(file.map(testFile));
			} else {
				testFile(file);
			}
		});
	});

	after(function () {
		cache = {};
	});
});
