const getApplicationInfo = require("./getApplicationInfo");
const multiChoice = require("./multiChoice");
const serviceMgr = require("./serviceMgr");
const settings = require("./settings");
const settingsPackageName = "com.android.settings";

const cleanerList = [
	{
		name: "先清理后台应用",
		summary: "推荐，增加操作成功率",
		action: "clearAnim",
	},
	{
		// 设置→小米帐号→关于小米帐号→系统广告→“关闭系统工具广告”
		summary: "设置→小米帐号→关闭系统工具广告",
		packageName: "com.xiaomi.account",
		action: ".ui.AccountSettingsActivity",
		settings: ["passportAD"],
	},
	{
		displayName: "系统安全",
		summary: "系统安全→网页拉活应用、日志上传等",
		packageName: settingsPackageName,
		action: "ACTION_SECURITY_SETTINGS",
		settings: [
			// 网页链接调用服务
			"httpInvokeApp",
			// 加入“用户体验改进计划”
			"uploadLog",
			// 自动发送诊断数据
			"uploadDebugLog",
		],
	},
	{
		// `广告服务` 位于 `安全` 的子页面
		displayName: "广告服务",
		summary: "系统安全→广告服务→个性化广告推荐",
		packageName: settingsPackageName,
		action: ".ad.AdServiceSettings",
		settings: ["personalizedAD"],
	},
	{
		// 应用商店
		packageName: "com.xiaomi.market",
		summary: "新手帮助、个性化服务、福利活动等",
		// activity: ".ui.MarketTabActivity",
	},
	{
		// 应用包管理组件
		summary: "安装监控、纯净模式、安全检查、资源推荐",
		packageName: "com.miui.packageinstaller",
		// action: "com.android.browser.BrowserActivity",
	},
	{
		// 下载管理程序
		packageName: "com.android.providers.downloads.ui",
		summary: "资源推荐、热榜推荐",
		action: ".activity.DownloadSettingActivity",
	},
	{
		// 手机管家→设置页
		summary: "在线服务、个性化推荐等",
		packageName: "com.miui.securitycenter",
		action: "com.miui.securityscan.ui.settings.SettingsActivity",
	},
	{
		// 手机管家→应用管理→设置页
		displayName: "应用管理",
		summary: "资源推荐",
		packageName: "com.miui.securitycenter",
		action: "com.miui.appmanager.AppManagerMainActivity",
	},
	{
		// 手机管家→垃圾清理→设置页
		packageName: "com.miui.cleanmaster",
		summary: "推荐内容、扫描内存",
		action: "com.miui.optimizecenter.settings.SettingsActivity",
	},
	{
		// 日历
		packageName: "com.android.calendar",
		summary: "天气服务、内容推广",
		action: ".settings.CalendarActionbarSettingsActivity",
	},
	{
		// 时钟
		packageName: "com.android.deskclock",
		summary: "生活早报",
		action: ".settings.SettingsActivity",
	},
	{
		// 小米社区
		packageName: "com.xiaomi.vipaccount",
		summary: "详情页相似推荐、个性化广告、信息流推荐",
		action: ".ui.home.page.HomeFrameActivity",
	},
	{
		// 小米天气
		packageName: "com.miui.weather2",
		summary: "天气视频卡片，内容推广",
		action: ".ActivityWeatherMain",
	},
	{
		// 小米视频
		packageName: "com.miui.video",
		summary: "内容推荐、广告推荐、在线服务、消息",
		action: ".feature.mine.setting.SettingActivity",
	},
	{
		// 小爱语音
		packageName: "com.miui.voiceassist",
		summary: "小爱技巧推送、个性化推荐、广告推荐等",
		action: "com.xiaomi.voiceassistant.settings.MiuiVoiceSettingActivity",
	},
	{
		// 搜索
		packageName: "com.android.quicksearchbox",
		summary: "热搜榜单、搜索精选等，开:广告过滤",
		action: ".preferences.SearchSettingsPreferenceActivity",
	},
	{
		// 小米浏览器国际版
		packageName: "com.mi.globalbrowser",
		summary: "宫格位、消息等，开:广告过滤、简洁版首页",
		action: "com.android.browser.BrowserActivity",
	},
	{
		// 小米浏览器国内版
		summary: "广告、消息等，开:广告过滤、简洁版首页",
		packageName: "com.android.browser",
		action: "com.android.browser.BrowserActivity",
	},
];

function getCleanerList () {
	return cleanerList.filter((cleaner) => {
		// 通过系统设置判断是否已经关闭该板块的广告，如果已经全部关闭，则不显示该模块
		if (cleaner.settings && cleaner.settings.every(key => settings[key] === false)) {
			cleaner.checked = false;
		}
		return !cleaner.packageName || getApplicationInfo(cleaner);
	});
}

function offAppAd () {
	multiChoice({
		title: "请选择要关闭广告的APP",
		itemList: getCleanerList(),
		checked: true,
	}).then(cleanerList => (
		settings.set(
			"accessibilityServiceEnabled",
			true,
			"操作其他APP的广告开关",
		).then(accessibilityServiceEnabled => {
			if (!accessibilityServiceEnabled) {
				return accessibilityServiceEnabled;
			}
			return settings.set(
				"drawOverlays",
				true,
			).then(
				() => serviceMgr(cleanerList),
			);
		})
	)).then(
		offAppAd,
	).catch(console.error);
	require("./index")();
};

module.exports = {
	name: "关闭各APP广告",
	summary: "自动查询并关闭各APP中的广告",
	icon: "./res/drawable/ic_no_ad.png",
	fn: offAppAd,
};
