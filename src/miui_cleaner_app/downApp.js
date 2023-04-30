const getApplicationInfo = require("./getApplicationInfo");
const getRemoteFileInfo = require("./getRemoteFileInfo");
const singleChoice = require("./singleChoice");
const prettyBytes = require("pretty-bytes");
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
		packageName: "hello.litiaotiao.app",
		url: "https://www.123pan.com/s/ZYAZVv-TBYjd",
		filter: function (files) {
			return files.filter(file => {
				return /李跳跳|MissLee/.test(file.fileName) && !file.fileName.includes("真实好友");
			});
		},
	},
	{
		name: "QQ音乐简洁版",
		summary: "MIUI音乐APP套壳的产品",
		icon: "https://m.32r.com/logo/210807/202108070906595774.png",
		packageName: "com.tencent.qqmusiclite",
		url: "https://wwi.lanzout.com/b046evhng#pwd=eeee",
		// https://www.32r.com/app/106580.html
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
		url: "https://wwm.lanzoul.com/tp/idzsf0bh062h",
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
	{
		name: "隐启设置",
		summary: "MIUI软件包安装程序v3.8.0，不含“纯净模式”",
		icon: "https://raw.fastgit.org/WangDaYeeeeee/GeometricWeather/master/app/src/main/res/drawable/ic_launcher.png",
		packageName: "com.miui.gaojishezhi.plus",
		url: "https://www.coolapk.com/apk/com.miui.gaojishezhi.plus",
	},
	{
		name: "应用包管理组件",
		summary: "MIUI软件包安装程序v3.8.0，不含“纯净模式”",
		icon: "http://pic.danji100.com/upload/2022-4/20224261118377118.png",
		packageName: "com.miui.packageinstaller",
		url: "https://zisu.lanzoum.com/tp/iI7LGwn5xjc",
		filter: function (files) {
			files = files.map(file => {
				const miuiInst = file.fileName.match(/(应用包管理组件).*?([\d.]+)-(\d+).*?(\.\w+)$/);
				if (miuiInst) {
					const appName = miuiInst[1];
					const versionCode = Number.parseInt(miuiInst[2].replace(/\./g, ""), 10);
					const versionName = `${Array.from(String(versionCode)).join(".")}-${miuiInst[3]}`;
					file.fileName = `${appName}_v${versionName}${miuiInst[4]}`;
					file.versionName = versionName;
					file.versionCode = versionCode;
				}
				return file;
			});
		},
	},
	{
		name: "几何天气",
		summary: "干净、小巧、漂亮、功能多",
		icon: "https://raw.fastgit.org/WangDaYeeeeee/GeometricWeather/master/app/src/main/res/drawable/ic_launcher.png",
		packageName: "wangdaye.com.geometricweather",
		url: "https://github.com/WangDaYeeeeee/GeometricWeather/releases/latest",
		filter: function (files) {
			const appInfo = this;
			files = files.filter(file => {
				const verInfo = file.url.match(/\/(.+?)\/.*?\.\1_(\w+)\.\w+$/);
				if (verInfo) {
					const verName = verInfo[1];
					const verType = verInfo[2];
					file.versionName = `${verName}_${verType}`;
					file.versionCode = Number.parseInt(verName.replace(/\./, ""), 10);
				}
				return verInfo;
			});

			if (appInfo.appName) {
				let subVer = appInfo.getVersionName().match(/_\w+$/);
				if (subVer) {
					subVer = subVer[0] + ".apk";
					return files.filter(file => file.fileName.endsWith(subVer));
				}
			}
			return [files[files.length - 1]];
		},
	},
	{
		name: "Holi天气",
		summary: "无广告，体较小，更漂亮，替代“小米天气”",
		icon: "http://pp.myapp.com/ma_icon/0/icon_42394164_1637810437/256",
		packageName: "com.joe.holi",
		url: "https://www.coolapk.com/apk/com.joe.holi",
	},
	{
		name: "ES文件浏览器",
		summary: "去广告版，替代MIUI视频、音乐、文档查看器",
		icon: "https://m.32r.com/logo/220311/202203111728435421.png",
		packageName: "com.estrongs.android.pop",
		url: "https://www.123pan.com/s/A6cA-C29Jh",
		// url: "https://423down.lanzouv.com/b0f1d7s2h",
		// https://www.423down.com/6011.html
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
		url: "https://www.123pan.com/s/A6cA-dJAJh",
		// url: "https://423down.lanzouo.com/b0f2lkafe",
		// url: "https://m.32r.com/app/80966.html",
		// https://www.423down.com/11775.html
		filter: function (files) {
			return files.filter(file => {
				return /知乎.*知了/.test(file.fileName);
			});
		},
	},
	{
		name: "哔哩哔哩",
		summary: "“设置→哔哩漫游→关于版本”点五下有惊喜",
		icon: "https://m.32r.com/logo/221114/202211141125334046.png",
		packageName: "tv.danmaku.bili",
		// url: "https://www.123pan.com/s/A6cA-gT9Jh",
		url: "https://423down.lanzouv.com/b0f1gksne",
		// https://www.423down.com/12235.html
		filter: function (files) {
			return files.filter(file => {
				return /哔哩哔哩.*漫游/.test(file.fileName);
			});
		},
	},
	{
		name: "优酷视频",
		summary: "去广告版",
		icon: "https://img.alicdn.com/tfs/TB1WeJ9Xrj1gK0jSZFuXXcrHpXa-195-195.png",
		packageName: "com.youku.phone",
		url: "https://423down.lanzouv.com/b0f1avpib",
		// https://www.423down.com/8526.html
		filter: function (files) {
			return files.filter(file => {
				file.fileName = file.fileName.replace(/忧(?=酷)/g, "优");
				return file.fileName.includes("优酷视频");
			});
		},
	},
	{
		name: "高德地图",
		summary: "Google版、纯净版",
		icon: "https://m.amap.com/img/screenLogo.png",
		packageName: "com.autonavi.minimap",
		url: "https://423down.lanzouv.com/b0f29j15c",
		// https://www.423down.com/14492.html
	},
	{
		name: "百度贴吧",
		summary: "去广告版",
		icon: "https://m.32r.com/logo/210810/202108101711331977.png",
		packageName: "com.baidu.tieba",
		url: "https://www.123pan.com/s/A6cA-Y89Jh",
		// url: "https://423down.lanzouv.com/b0f1b6q8d",
		// https://www.423down.com/4815.html
	},
	{
		name: "酷安",
		summary: "应用商店，去广告版",
		icon: "https://static.coolapk.com/static/web/v8/images/header-logo.png",
		packageName: "com.coolapk.market",
		url: "https://www.123pan.com/s/A6cA-Om9Jh",
		// url: "https://423down.lanzouv.com/b0f2uzq2b",
		// https://www.423down.com/10777.html
	},
	{
		name: "App分享",
		summary: "应用商店，刷机包，国际版提取的APP",
		icon: "http://pic.xfdown.com/uploads/2022-5/2022551511344265.png",
		packageName: "info.muge.appshare",
		// url: "https://www.123pan.com/s/A6cA-Jb9Jh",
		url: "https://www.123pan.com/s/s1luVv-LbkXv",
		// url: "https://423down.lanzouv.com/tp/iDS6A0sl6vsf",
		// https://www.423down.com/13728.html
	},
];

function formatSize (number, options) {
	if (!number || !Number.isSafeInteger(number)) {
		return number;
	}
	return prettyBytes(number, {
		binary: true,
		...options,
	});
}

function formatDate (number) {
	if (!number || !Number.isSafeInteger(number)) {
		return number;
	}
	const dateFormat = android.text.format.DateFormat.getDateFormat(activity);
	return dateFormat.format(number) || number;
}

async function download (appInfo, item) {
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
	const View = android.view.View;
	let progress = item.progress;
	if (progress) {
		progress.setVisibility(View.VISIBLE);
		progress.indeterminate = true;
	} else {
		progress = ui.inflate(`
			<progressbar id="progress" indeterminate="true" layout_centerHorizontal="true" layout_alignParentBottom="true" w="*" h="auto" style="@style/Base.Widget.AppCompat.ProgressBar.Horizontal" />
		`, item, true);
	}
	let file;
	let getLocationTask;
	function getLocation () {
		if (file && file.getLocation) {
			getLocationTask = file.getLocation(true);
		}
	};
	try {
		file = await getRemoteFiles(appInfo);
		if (file.length > 1) {
			const choice = await dialogs.singleChoice(file.map(file => ({
				toString: () => file.fileName + "\n" + [
					file.versionName,
					formatSize(file.size),
					formatDate(file.lastModified),
				].filter(Boolean).join(" | "),
				file,
			})), {
				title: `请选择要下载的“${appInfo.appName || appInfo.name}”版本`,
				neutral: true,
			});
			file = choice && choice.file;
			getLocation();
		} else {
			file = file[0];
			getLocation();
			const localVer = appInfo.appName && appInfo.getVersionName();
			const confirm = await dialogs.confirm([
				file.versionName && `版本：${(localVer ? `${localVer} → ` : "") + file.versionName}`,
				file.size && `大小：${formatSize(file.size)}`,
				file.lastModified && `日期：${formatDate(file.lastModified)}`,
			].filter(Boolean).join("\n"), {
				title: `是否${appInfo.appName ? "更新" : "下载"}“${appInfo.appName || appInfo.name}”？`,
				neutral: true,
			});
			file = confirm && file;
		}
	} catch (ex) {
		console.error(ex);
		file = null;
	}

	if (file) {
		await getLocationTask;
		const downTask = downFile(file);
		downTask.on("progress", (e) => {
			progress.indeterminate = false;
			progress.max = e.size;
			progress.progress = e.progress;
		});
		const intent = await downTask;
		const confirm = intent.getPackage() || (await dialogs.confirm(`“${file.fileName}”下载完毕，立即安装？`, {
			title: "确认安装",
		}));
		if (confirm) {
			app.startActivity(intent);
		}
	} else if (file === null && appInfo.url) {
		app.openUrl(appInfo.url);
	}
	progress.setVisibility(View.GONE);
}

function verCompare (verA, verB) {
	function splitVer (versionName) {
		return versionName.replace(/^\D+|\D+$/g, "").split(/\./g);
	}
	function parseNum (str) {
		return Number.parseInt(str, 10) || 0;
	}
	verA = splitVer(verA);
	verB = splitVer(verB);
	const length = Math.max(verA.length, verB.length);
	let result;
	for (let i = 0; i < length && !result; i++) {
		result = parseNum(verA[i]) - parseNum(verB[i]);
	}
	return result;
}

function fileCompare (b, a) {
	let result;
	if (a.versionCode && b.versionCode) {
		result = a.versionCode - b.versionCode;
	}
	if (a.versionName && b.versionName) {
		result = result || verCompare(a.versionName, b.versionName);
	}
	if (a.lastModified && b.lastModified) {
		result = result || a.lastModified - b.lastModified;
	}
	return result;
}

function getRemoteFiles (appInfo) {
	return getRemoteFileInfo(appInfo.url).then(fileList => {
		if (!fileList) {
			return;
		}
		if (!Array.isArray(fileList)) {
			fileList = [fileList];
		}
		if (appInfo.filter) {
			fileList = appInfo.filter(fileList) || fileList;
		} else if (fileList.length > 1) {
			fileList = fileList.filter(file => file.fileName.includes(appInfo.name));
		}
		fileList = fileList.sort(fileCompare);
		if (fileList.length > 1 && fileList[0].versionName) {
			fileList = fileList.filter(file => file.versionName === fileList[0].versionName);
		}
		if (fileList.length > 1) {
			const mouse = fileList.find(file => /耗/.test(file.fileName));
			if (mouse) {
				fileList = [mouse];
			}
		}
		return fileList;
	});
}

function downApp () {
	appList.forEach((appInfo) => {
		getApplicationInfo(appInfo);
		if (appInfo.appName) {
			appInfo.displayName = appInfo.appName + " v" + appInfo.getVersionName();
			// if (!/^\w+:\/\/app.mi.com\//i.test(appInfo.url)) {
			// 	getRemoteFiles(appInfo);
			// }
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
	name: "去广告版APP",
	summary: "各APP的去广告版和广告自动跳过工具",
	icon: "./res/drawable/ic_download.png",
	fn: downApp,
};
