const getApplicationInfo = require("./getApplicationInfo");
const singleChoice = require("./singleChoice");
const waitForBack = require("./waitForBack");
const settings = require("./settings");

// https://github.abskoop.workers.dev/
// http://fastgit.org/
// https://download.fastgit.org/skylot/jadx/releases/download/v1.4.4/jadx-gui-1.4.4-no-jre-win.exe
// https://download.fastgit.org/MrIkso/ArscEditor/releases/download/1.0.2/ArscEditor-1.0.2.zip

const appList = [
	{
		name: "李跳跳",
		summary: "干净小巧的广告自动跳过工具",
		icon: "https://litiaotiao.cn/apple-touch-icon.png",
		packageName: "cn.litiaotiao.app",
		url: [
			"https://litiaotiao.cn/",
			"https://www.123pan.com/s/A6cA-edAJh",
		],
		// 'cn.litiaotiao.app/com.litiaotiao.app.LttService'
	},

	{
		name: "Edge",
		summary: "浏览器，微软出品，带广告屏蔽功能",
		icon: "http://file.market.xiaomi.com/thumbnail/PNG/l114/AppStore/083ca7b4c3bc34d6ca687789daa6747ea368d8747",
		packageName: "com.microsoft.emmx",
		url: [
			"https://www.coolapk.com/apk/com.microsoft.emmx",
			"https://app.mi.com/details?id=com.microsoft.emmx",
		],
	},
	{
		name: "小米浏览器",
		summary: "国际版",
		icon: "http://img.itmop.com/upload/2018-2/2018227171959917.png",
		packageName: "com.mi.globalbrowser",
		url: [
			"https://wwm.lanzouj.com/idzsf0bh062h",
			"https://www.firepx.com/app/android-mi-browser-google-play/",
			"https://com-globalbrowser.cn.aptoide.com/app",
		],
	},
	{
		name: "讯飞输入法",
		summary: "定制版、Google Play版",
		icon: "http://file.market.xiaomi.com/thumbnail/PNG/l114/AppStore/04f6d4e16c4c41e570c4daf8349ad32f1e342cb66",
		packageName: "com.iflytek.inputmethod",
		url: [
			"https://firepx.lanzoul.com/b00vf92jc#\n密码:647w",
			// "https://app.meizu.com/apps/public/detail?package_name=com.iflytek.inputmethod",
			"https://423down.lanzouv.com/b0f24av5i",
		],
		// [
		// 	"https://www.coolapk.com/apk/com.iflytek.inputmethod",
		// 	"https://app.mi.com/details?id=com.iflytek.inputmethod",
		// ]
	},
	{
		name: "软件包安装程序",
		summary: "Google版",
		packageName: "com.google.android.packageinstaller",
		icon: "https://file.1xiazai.net/d/file/android/20220728/202266164286724.png",
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
		name: "应用包管理组件",
		summary: "MIUI软件包安装程序v3.8.0，不含“纯净模式”",
		icon: "https://img.1xiazai.net/d/file/android/20220407/2021731123154350.png",
		packageName: "com.miui.packageinstaller",
		url: "https://zisu.lanzoum.com/iI7LGwn5xjc",
	},
	{
		name: "QQ音乐简洁版",
		summary: "v3.8.0 MIUI 音乐APP套壳的产品",
		icon: "http://file.market.xiaomi.com/thumbnail/PNG/l114/AppStore/0f487cb7981174cf5a5338085d4d4acd5b1279946",
		packageName: "com.tencent.qqmusiclite",
		url: [
			"https://www.coolapk.com/apk/com.tencent.qqmusiclite",
			"https://app.mi.com/details?id=com.tencent.qqmusiclite",
		],
	},
	{
		name: "Holi天气",
		summary: "干净、小巧、漂亮、功能多",
		icon: "http://pp.myapp.com/ma_icon/0/icon_42394164_1637810437/128",
		packageName: "com.joe.holi",
		url: [
			"https://www.coolapk.com/apk/com.joe.holi",
			"https://app.mi.com/details?id=com.joe.holi",
		],
	},
	{
		name: "ES文件浏览器",
		summary: "去广告版，替代MIUI视频、音乐、文档查看器",
		icon: "http://file.market.xiaomi.com/thumbnail/PNG/l114/AppStore/05b6f55415e9941468fd3185ebe8d80816335f599",
		packageName: "com.estrongs.android.pop",
		url: "https://423down.lanzouv.com/b0f1d7s2h",
	},
	{
		name: "WPS Office Lite",
		summary: "国际版，无广告，替代“文档查看器”",
		icon: "https://findorra.com/apps/app/images/appicons/85525195-e34c-4314-a771-454e60c2e7de.PNG",
		packageName: "cn.wps.moffice_i18n",
		url: "https://www.32r.com/app/109976.html",
	},
	{
		name: "知乎",
		summary: "集成“知了”，“设置→知了”中有去广告开关",
		icon: "https://static.zhihu.com/heifetz/assets/apple-touch-icon-60.8f6c52aa.png",
		packageName: "com.zhihu.android",
		url: "https://423down.lanzouo.com/b0f2lkafe",
		// url: "www.baidu.com",
	},
	{
		name: "哔哩哔哩",
		summary: "“设置→哔哩漫游→关于版本”点五下有惊喜",
		icon: "http://file.market.xiaomi.com/thumbnail/PNG/l114/AppStore/096ba00f21e7f4633b0cbc9e596b5ab5233f608b5",
		packageName: "tv.danmaku.bili",
		url: "https://423down.lanzouv.com/b0f1gksne",
	},
	{
		name: "优酷视频",
		summary: "去广告版",
		icon: "https://img.alicdn.com/tfs/TB1WeJ9Xrj1gK0jSZFuXXcrHpXa-195-195.png",
		packageName: "com.youku.phone",
		url: "https://423down.lanzouv.com/b0f1avpib",
	},
	{
		name: "百度贴吧",
		summary: "去广告版",
		icon: "http://file.market.xiaomi.com/thumbnail/PNG/l114/AppStore/02f3ec586a44940620835c58ff9b3c760914d1725",
		packageName: "com.baidu.tieba",
		url: "https://423down.lanzouv.com/b0f1b6q8d",
	},
	{
		name: "酷安",
		summary: "应用商店，去广告版",
		icon: "https://static.coolapk.com/static/web/v8/images/header-logo.png",
		packageName: "com.coolapk.market",
		url: "https://423down.lanzouv.com/b0f2uzq2b",
	},
	{
		name: "AppShare",
		summary: "应用商店，刷机包，国际版提取的APP",
		icon: "http://pic.xfdown.com/uploads/2022-5/2022551511344265.png",
		packageName: "info.muge.appshare",
		url: "https://423down.lanzouv.com/iHmmD06tw9xa",
	},
];

function download (appInfo) {
	if (typeof appInfo === "string") {
		appInfo = appList.find(info => info.packageName === appInfo);
	}

	if (appInfo.url) {
		return (
			Array.isArray(appInfo.url)
				? dialogs.select("请选一个网址", appInfo.url).then(index => appInfo.url[index] || appInfo.url[0])
				: Promise.resolve(appInfo.url)
		).then(url => waitForBack(() => {
			if (url.startsWith("https://app.mi.com/")) {
				app.startActivity({
					action: "android.intent.action.VIEW",
					data: "market://details?id=" + appInfo.packageName,
				});
			} else {
				app.openUrl(url);
			}
		})).then(() => {
			const appName = app.getAppName(appInfo.packageName);
			if (appName) {
				appInfo.appName = appName;
				return appInfo;
			}
			const liTiaoTiao = "cn.litiaotiao.app";
			if (app.getAppName(liTiaoTiao)) {
				settings.accessibilityServices.add(liTiaoTiao + "/com.litiaotiao.app.LttService");
			}
		}).catch(console.error);
	} else {
		alert("该应用暂不支持您的设备");
		return null;
	}
}

function downApp () {
	appList.forEach((appInfo) => {
		getApplicationInfo(appInfo);
		if (appInfo.appName) {
			appInfo.appName = appInfo.appName.replace(/(\s+v.*?)?$/, " v" + appInfo.getVersionName());
		}
	});
	singleChoice({
		title: "请选择要下载的APP",
		itemList: appList,
		fn: download,
	});
	require("./index")();
}
// downApp.download = downApp;
module.exports = {
	name: "去广告APP",
	summary: "各APP的去广告版和广告自动跳过工具",
	icon: "./res/drawable/ic_download.png",
	fn: downApp,
};
