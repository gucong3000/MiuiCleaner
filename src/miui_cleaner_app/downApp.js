const getApplicationInfo = require("./getApplicationInfo");
const singleChoice = require("./singleChoice");
const getDownOpts = require("./getDownOpts");
const downFile = require("./downFile");
const dialogs = require("./dialogs");

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
		url: "https://wwe.lanzouw.com/b01v0g3wj#pwd=1233",
	},
	{
		name: "Edge",
		summary: "浏览器，微软出品，带广告屏蔽功能",
		icon: "https://edgefrecdn.azureedge.net/welcome/static/favicon.png",
		packageName: "com.microsoft.emmx",
		url: "https://app.mi.com/details?id=com.microsoft.emmx",
	},
	{
		name: "小米浏览器",
		summary: "国际版",
		icon: "https://m.32r.com/logo/210519/202105191427372351.png",
		packageName: "com.mi.globalbrowser",
		url: "https://wwm.lanzouj.com/tp/idzsf0bh062h",
	},
	{
		name: "讯飞输入法",
		summary: "定制版、Google Play版",
		icon: "https://srf.xunfei.cn/favicon.ico",
		packageName: "com.iflytek.inputmethod",
		// url: "https://app.meizu.com/apps/public/detail?package_name=com.iflytek.inputmethod",
		// url: "https://m.32r.com/app/7401.html",
		url: "https://firepx.lanzoul.com/b00vf92jc#pwd=647w",
	},
	// {
	// 	name: "软件包安装程序",
	// 	summary: "Google版",
	// 	packageName: "com.google.android.packageinstaller",
	// 	icon: "https://file.1xiazai.net/d/file/android/20220728/202266164286724.png",
	// 	url: {
	// 		// 3.01 MB 版本号 未知 适用于安卓 13 SDK 33
	// 		33: "https://www.123pan.com/s/OZe0Vv-iOKl3",
	// 		// 3.14 MB 版本号 12-7567768 适用于安卓 12 SDK 31
	// 		31: "https://www.123pan.com/s/OZe0Vv-LOKl3",
	// 		// 3.13 MB 版本号 11-7532981 适用于安卓 11 SDK 30
	// 		30: "https://www.123pan.com/s/OZe0Vv-zOKl3",
	// 		// 1.83 MB 版本号 10-7029319 适用于安卓 10 SDK 29
	// 		29: "https://www.123pan.com/s/OZe0Vv-tOKl3",
	// 		// 8.55 MB 版本号 9-7126274 适用于安卓 9 SDK 28
	// 		28: "https://www.123pan.com/s/OZe0Vv-qOKl3",
	// 	}[device.sdkInt],
	// },
	{
		name: "应用包管理组件",
		summary: "MIUI软件包安装程序v3.8.0，不含“纯净模式”",
		icon: "https://img.1xiazai.net/d/file/android/20220407/2021731123154350.png",
		packageName: "com.miui.packageinstaller",
		url: "https://zisu.lanzoum.com/tp/iI7LGwn5xjc",
	},
	{
		name: "QQ音乐简洁版",
		summary: "MIUI音乐APP套壳的产品",
		icon: "https://m.32r.com/logo/210807/202108070906595774.png",
		packageName: "com.tencent.qqmusiclite",
		url: "https://app.mi.com/details?id=com.tencent.qqmusiclite",
	},
	{
		name: "几何天气",
		summary: "干净、小巧、漂亮、功能多",
		icon: "https://raw.fastgit.org/WangDaYeeeeee/GeometricWeather/master/app/src/main/res/drawable/ic_launcher.png",
		packageName: "wangdaye.com.geometricweather",
		url: "https://github.com/WangDaYeeeeee/GeometricWeather/releases/latest",
	},
	{
		name: "ES文件浏览器",
		summary: "去广告版，替代MIUI视频、音乐、文档查看器",
		icon: "https://m.32r.com/logo/220311/202203111728435421.png",
		packageName: "com.estrongs.android.pop",
		url: "https://423down.lanzouv.com/b0f1d7s2h",
	},
	{
		name: "WPS Office Lite",
		summary: "国际版，无广告，替代“文档查看器”",
		icon: "https://m.32r.com/logo/220908/202209081617517363.png",
		packageName: "cn.wps.moffice_i18n",
		url: "https://m.32r.com/app/109976.html",
	},
	{
		name: "知乎",
		summary: "集成“知了”，“设置→知了”中有去广告开关",
		icon: "https://static.zhihu.com/heifetz/assets/apple-touch-icon-60.8f6c52aa.png",
		packageName: "com.zhihu.android",
		url: "https://423down.lanzouo.com/b0f2lkafe",
		// url: "https://m.32r.com/app/80966.html",
	},
	{
		name: "哔哩哔哩",
		summary: "“设置→哔哩漫游→关于版本”点五下有惊喜",
		icon: "https://m.32r.com/logo/221114/202211141125334046.png",
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
		name: "高德地图",
		summary: "Google版、纯净版",
		icon: "https://m.amap.com/img/screenLogo.png",
		packageName: "com.autonavi.minimap",
		url: "https://423down.lanzouv.com/b0f29j15c",
	},
	{
		name: "百度贴吧",
		summary: "去广告版",
		icon: "https://m.32r.com/logo/210810/202108101711331977.png",
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
		name: "App分享",
		summary: "应用商店，刷机包，国际版提取的APP",
		icon: "http://pic.xfdown.com/uploads/2022-5/2022551511344265.png",
		packageName: "info.muge.appshare",
		url: "https://423down.lanzouv.com/tp/iHmmD06tw9xa",
	},
];

function download (appInfo, item) {
	if (typeof appInfo === "string") {
		appInfo = appList.find(info => info.packageName === appInfo);
	}
	if (/^\w+:\/\/app.mi.com\//i.test(appInfo.url)) {
		app.startActivity({
			action: "android.intent.action.VIEW",
			data: "market://details?id=" + appInfo.packageName,
		});
		return;
	}
	let progress = item.progress;
	if (progress) {
		progress.setVisibility(android.view.View.VISIBLE);
		progress.indeterminate = true;
	} else {
		progress = ui.inflate(`
			<progressbar id="progress" indeterminate="true" layout_centerHorizontal="true" layout_alignParentBottom="true" w="*" h="auto"style="@style/Base.Widget.AppCompat.ProgressBar.Horizontal" />
		`, item, true);
	}
	function hideProgress () {
		progress.setVisibility(android.view.View.GONE);
	}
	return getDownOpts(appInfo.url, appInfo).then(downOpts => {
		if (!downOpts) {
			hideProgress();
			return;
		}
		const downTask = downFile(downOpts);
		downTask.on("progress", (e) => {
			progress.indeterminate = false;
			progress.max = e.size;
			progress.progress = e.progress;
		});
		return downTask.then(intent => {
			hideProgress();
			let confirm = intent.getPackage();
			if (confirm) {
				confirm = Promise.resolve(confirm);
			} else {
				confirm = dialogs.confirm(`“${downOpts.fileName}”下载完毕，立即安装？`, {
					title: "确认安装",
				});
			}
			return confirm.then(confirm => {
				if (confirm) {
					return app.startActivity(intent);
				}
			});
		});
	});
}

function downApp () {
	appList.forEach((appInfo) => {
		getApplicationInfo(appInfo);
		if (appInfo.appName) {
			appInfo.displayName = appInfo.appName + " v" + appInfo.getVersionName();
		} else {
			delete appInfo.displayName;
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
