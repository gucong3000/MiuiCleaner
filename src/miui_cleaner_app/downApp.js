const singleChoice = require("./singleChoice");
const blur = require("./blur");

// https://github.abskoop.workers.dev/
// http://fastgit.org/

const appList = [
	{
		name: "李跳跳 - 广告自动跳过",
		packageName: "cn.litiaotiao.app",
		url: "https://www.123pan.com/s/A6cA-edAJh",
	},

	{
		name: "Edge 浏览器",
		packageName: "com.microsoft.emmx",
		url: [
			"https://www.coolapk.com/apk/com.microsoft.emmx",
			"https://app.mi.com/details?id=com.microsoft.emmx",
		],
	},
	{
		name: "小米浏览器 - 国际版",
		packageName: "com.mi.globalbrowser",
		url: [
			"https://wwm.lanzouj.com/idzsf0bh062h",
			"https://www.firepx.com/app/android-mi-browser-google-play/",
			"https://com-globalbrowser.cn.aptoide.com/app",
		],
	},
	{
		name: "讯飞输入法",
		packageName: "com.iflytek.inputmethod",
		url: "https://423down.lanzouv.com/b0f24av5i",
		// [
		// 	"https://www.coolapk.com/apk/com.iflytek.inputmethod",
		// 	"https://app.mi.com/details?id=com.iflytek.inputmethod",
		// ]
	},
	{
		name: "软件包安装程序 - Google版",
		packageName: "com.google.android.packageinstaller",
		url: {
			// 3.01 MB 版本号 未知 适用于安卓 13 SDK 33
			33: "https://www.123pan.com/s/OZe0Vv-iOKl3",
			// 3.14 MB 版本号 12-7567768 适用于安卓 12 SDK 31
			31: "https://www.123pan.com/s/OZe0Vv-LOKl3",
			// 3.13 MB 版本号 11-7532981 适用于安卓 11 SDK 30
			30: "https://www.123pan.com/s/OZe0Vv-zOKl3",
			// 1.83 MB 版本号 10-7029319 适用于安卓 10 SDK 29
			29: "https://www.123pan.com/s/OZe0Vv-tOKl3",
			// 8.55 MB 版本号 9-7126274 适用于安卓 9 SDK 28
			28: "https://www.123pan.com/s/OZe0Vv-qOKl3",
		}[device.sdkInt],
	},
	{
		name: "应用包管理组件 - 不含“纯净模式”",
		packageName: "com.miui.packageinstaller",
		url: "https://zisu.lanzoum.com/iI7LGwn5xjc",
	},
	{
		name: "QQ音乐简洁版 - 代替套壳版本",
		packageName: "com.tencent.qqmusiclite",
		url: [
			"https://www.coolapk.com/apk/com.tencent.qqmusiclite",
			"https://app.mi.com/details?id=com.tencent.qqmusiclite",
		],
	},
	{
		name: "Holi 天气",
		packageName: "com.joe.holi",
		url: [
			"https://www.coolapk.com/apk/com.joe.holi",
			"https://app.mi.com/details?id=com.joe.holi",
		],
	},
	{
		name: "ES文件浏览器",
		packageName: "com.estrongs.android.pop",
		url: "https://423down.lanzouv.com/b0f1d7s2h",
	},
	{
		name: "知乎 - 集成“知了”",
		packageName: "com.zhihu.android",
		url: "https://423down.lanzouo.com/b0f2lkafe",
		// url: "www.baidu.com",
	},
	{
		name: "哔哩哔哩 - 集成“哔哩漫游”",
		packageName: "tv.danmaku.bili",
		url: "https://423down.lanzouv.com/b0f1gksne",
	},
	{
		name: "优酷视频 - 修改版",
		packageName: "com.youku.phone",
		url: "https://423down.lanzouv.com/b0f1avpib",
	},
	{
		name: "百度贴吧 - 修改版",
		packageName: "com.baidu.tieba",
		url: "https://423down.lanzouv.com/b0f1b6q8d",
	},
	{
		name: "酷安 - 应用商店 - 修改版",
		packageName: "com.coolapk.market",
		url: "https://423down.lanzouv.com/b0f2uzq2b",
	},
	{
		name: "AppShare - 应用商店",
		packageName: "info.muge.appshare",
		url: "https://appshare.muge.info/",
	},
];

function download (appInfo) {
	if (typeof appInfo === "string") {
		appInfo = appList.find(info => info.packageName === appInfo);
	}

	if (appInfo.url) {
		const url = Array.isArray(appInfo.url)
			? appInfo.url[dialogs.select("请选一个网址", appInfo.url)] || appInfo.url[0]
			: appInfo.url;
		if (url.startsWith("https://app.mi.com/")) {
			app.startActivity({
				action: "android.intent.action.VIEW",
				data: "market://details?id=" + appInfo.packageName,
			});
		} else {
			app.openUrl(url);
		}
	} else {
		alert("该应用暂不支持您的设备");
		return null;
	}
	blur();
	const appName = app.getAppName(appInfo.packageName);
	if (appName) {
		appInfo.appName = appName;
		return appInfo;
	}
}

function choice () {
	// appList.forEach(appInfo => {
	// 	appInfo.appName = app.getAppName(appInfo.packageName);
	// });
	const appInfo = singleChoice("请选择", appList);
	if (appInfo) {
		download(appInfo);
		choice();
	}
}
module.exports = download;
module.exports.choice = choice;
