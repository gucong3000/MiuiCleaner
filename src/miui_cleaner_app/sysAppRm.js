const multiChoice = require("./multiChoice");
const blur = require("./blur");
const findClickableParent = require("./findClickableParent");

function clickButton (button, text) {
	button = findClickableParent(button);
	if (button) {
		button.click();
	}
}

// https://fengooge.blogspot.com/2019/03/taking-ADB-to-uninstall-system-applications-in-MIUI-without-root.html
const packageNameList = [
	// APP 外置开屏广告
	// 广告分析
	"com.miui.analytics",
	// 小米系统广告解决方案（智能服务）
	"com.miui.systemAdSolution",
	// 桌面广告 APP
	// 智能助理（负一屏）
	"com.miui.personalassistant",
	// 信息助手（负一屏）
	"com.mi.android.globalminusscreen",
	// 智能出行
	"com.miui.smarttravel",
	// 内容中心（趣看看）
	"com.miui.newhome",
	// 百度搜索框
	"com.baidu.searchbox",
	// 桌面搜索框（搜索/全局搜索）
	"com.android.quicksearchbox",
	// 桌面搜索框（Google）
	"com.google.android.googlequicksearchbox",
	// 过时的 APP
	// 悬浮球
	"com.miui.touchassistant",
	// 小米闻声
	"com.miui.accessibility",
	// 智慧生活
	"com.miui.hybrid.accessory",
	// 影音类 APP
	// 音乐
	"com.miui.player",
	// Mi Video
	"com.miui.videoplayer",
	// 小米视频
	"com.miui.video",
	// 腾讯视频小米版
	"com.tencent.qqlivexiaomi",
	// 爱奇艺播放器
	"com.qiyi.video.sdkplayer",
	// 天气
	// 小米天气
	"com.miui.weather2",
	// 支付、电商、理财类 APP
	// 小米商城
	"com.xiaomi.shop",
	// 小米商城系统组件（电商助手）
	"com.xiaomi.ab",
	// 小米钱包
	"com.mipay.wallet",
	// 米币支付
	"com.xiaomi.payment",
	// 小米支付
	"com.miui.nextpay",
	// 小米卡包
	"com.xiaomi.pass",
	// 小米金融（天星金融）
	"com.xiaomi.jr",
	// 小米金融（天星金融）- 安全组件
	"com.xiaomi.jr.security",
	// 小米金服安全组件
	"com.xiaomi.mifisecurity",
	// 银联可信服务安全组件小米版
	"com.unionpay.tsmservice.mi",
	// 低使用频率 APP
	// 小米换机
	"com.miui.huanji",
	// 小米社区
	"com.xiaomi.vipaccount",
	// 用户反馈
	"com.miui.bugreport",
	// 服务与反馈
	"com.miui.miservice",
	// 小米画报
	"com.mfashiongallery.emag",
	// 动态壁纸
	"com.android.wallpaper",
	// 动态壁纸获取
	"com.android.wallpaper.livepicker",
	// 收音机（蜻蜓FM）
	"com.miui.fm",
	// 阅读（番茄免费小说）
	"com.dragon.read",
	// 阅读（多看阅读器）
	"com.duokan.reader",
	// 小米运动健康
	"com.mi.health",
	// 浏览器
	// 小米浏览器
	"com.android.browser",
	// 小米浏览器（国际版）
	"com.mi.globalbrowser",
	// Chrome
	"com.android.chrome",
	// 内置输入法
	// 百度输入法-小米版
	"com.baidu.input_mi",
	// 搜狗输入法-小米版
	"com.sohu.inputmethod.sogou.xiaomi",
	// 讯飞输入法-小米版
	"com.iflytek.inputmethod.miui",
	// 小米安全键盘
	"com.miui.securityinputmethod",
	// 游戏中心（旧版）
	"com.xiaomi.migameservice",
	// 游戏中心
	"com.xiaomi.gamecenter",
	// 游戏服务
	"com.xiaomi.gamecenter.sdk.service",
	// 游戏中心 - pad 版
	"com.xiaomi.gamecenter.pad",
	// SIM 卡应用
	// 小米移动
	"com.xiaomi.mimobile",
	// 全球上网
	"com.miui.virtualsim",
	// 小米云流量
	"com.xiaomi.mimobile.cloudsim",
	// 全球上网工具插件
	"com.xiaomi.mimobile.noti",
	// SIM卡应用
	"com.android.stk",
	// 快应用
	// 快应用中心
	"com.miui.quickappCenter.miAppStore",
	// 快应用服务框架
	"com.miui.hybrid",
	// 语音助手
	// 语音唤醒
	"com.miui.voiceassist",
	// 小爱语音(小爱同学)
	"com.miui.voicetrigger",
	// 小爱视觉（扫一扫）
	"com.xiaomi.scanner",
	// 小爱翻译
	"com.xiaomi.aiasst.vision",
	// 小爱通话（AI虚拟助手）
	"com.xiaomi.aiasst.service",
];

let appList;
const whitelist = /^com\.(miui\.(voiceassist|personalassistant)|android\.(quicksearchbox|chrome))$/;
function getAppList () {
	appList = packageNameList.map(packageName => ({
		appName: app.getAppName(packageName),
		checked: whitelist.test(packageName),
		packageName,
	})).filter(appInfo => appInfo.appName);
	appList.forEach(appInfo => {
		appInfo.checked = !whitelist.test(appInfo.packageName);
	});
	appList = appList.filter(appInfo => {
		appInfo.appName = app.getAppName(appInfo.packageName);
		return appInfo.appName;
	});
	return appList;
}

const installerPackageName = "com.miui.packageinstaller";
const installerAppName = app.getAppName(installerPackageName);

function installerHelper () {
	// 应用包安装程序选择界面，下次默认，不再提示
	clickButton(
		selector().filter(checkBox => (
			checkBox.checkable() && !checkBox.checked() && /下次默认.*不再提示/.test(checkBox.text()) && /\bandroid\b/.test(checkBox.packageName())
		)).findOnce(),
	);
	// 应用包安装程序选择界面，通过“应用包管理组件”运行
	clickButton(
		selector().filter(btn => (
			installerAppName === btn.text() && /\bandroid\b/.test(btn.packageName())
		)).findOnce(),
	);
	// 应用包管理组件，确定、继续按钮
	clickButton(
		selector().filter(btn => (
			/\b(continue|ok)_button$/.test(btn.id()) && installerPackageName === btn.packageName()
		)).findOnce(),
	);
	setTimeout(installerHelper, 0x50);
}

module.exports = () => {
	let tasks = multiChoice("请选择要卸载的APP", getAppList());
	if (!tasks.length) {
		return;
	}
	const helper = threads.start(installerHelper);
	tasks.forEach(appInfo => {
		app.uninstall(appInfo.packageName);
	});
	blur();
	helper.interrupt();

	tasks = tasks.filter(
		appInfo => app.getAppName(appInfo.packageName),
	).map(appInfo => {
		return "pm uninstall --user 0 " + appInfo.packageName;
	});
	if (!tasks.length) {
		return;
	}

	const cmdOffAd = "settings put global passport_ad_status OFF";
	let root;

	try {
		shell(cmdOffAd, true);
	} catch (ex) {
		root = false;
	}

	if (root) {
		toastLog("正以root权限删除");
		tasks.forEach(cmd => shell(cmd, true));
	} else {
		const shFilePath = "/sdcard/Download/MiuiCleaner.sh";
		tasks.push("rm -rf " + shFilePath);
		const script = [
			"#!/bin/sh",
			cmdOffAd,
		].concat(tasks).join("\n") + "\n";

		files.write(shFilePath, script);
		// alert(script);
		const cmd = "adb shell sh " + shFilePath;
		console.log("正以等候电脑端自动执行：\n" + cmd);
		toast("正以等候电脑端自动执行");
		const startTime = Date.now();
		let fileExist;
		do {
			sleep(0x200);
			fileExist = files.exists(shFilePath);
		} while (fileExist && Date.now() - startTime < 0x1000);
		if (fileExist) {
			dialogs.rawInput("等候电脑端自动执行超时，请在电脑手动执行命令：", cmd);
		} else {
			console.log("电脑端自动执行成功");
		}
	}
};
