const startActivity = require("./startActivity");
const singleChoice = require("./singleChoice");

// https://blog.unidevel.cn/xiao-mi-dian-zi-shu-shang-yi-xie-yin-cang-de-she-zhi/

const actions = [
	{
		name: "自启动管理",
		summary: "自启动及后台运行权限管理",
		icon: "./res/drawable/ic_check_list.png",
		packageName: "com.miui.securitycenter",
		className: "com.miui.permcenter.autostart.AutoStartManagementActivity",
	},
	{
		name: "通知管理",
		summary: "通知栏、悬浮提示、图标角标的管理",
		icon: "./res/drawable/ic_item_list.png",
		packageName: "com.miui.notification",
		className: "miui.notification.management.activity.NotificationAppListActivity",
	},
	{
		name: "APP卸载",
		summary: "APP的批量卸载",
		icon: "./res/drawable/ic_recovery.png",
		packageName: "com.miui.cleanmaster",
		className: "com.miui.optimizecenter.deepclean.installedapp.InstalledAppsActivity",
	},
	{
		name: "APP管理",
		summary: "手机管家的应用管理功能",
		icon: "./res/drawable/ic_settings.png",
		packageName: "com.miui.securitycenter",
		className: "com.miui.appmanager.AppManagerMainActivity",
	},
	// {
	// 	name: "应用升级",
	// 	packageName: "com.xiaomi.market",
	// 	className: ".ui.UpdateListActivity",
	// 	summary: "APP的更新管理",
	// },
	{
		name: "APP信息",
		summary: "权限管理模块",
		icon: "./res/drawable/ic_key.png",
		packageName: "com.android.settings",
		className: ".applications.ManageApplications",
	},
	// {
	// 	name: "甜品盒",
	// 	summary: "彩蛋",
	// 	icon: "./res/drawable/ic_android.png",
	// 	packageName: "com.android.systemui",
	// 	className: ".DessertCase",
	// },
	// {
	// 	name: "Marshmallow Land",
	// 	summary: "彩蛋",
	// 	icon: "./res/drawable/ic_android.png",
	// 	packageName: "com.android.systemui",
	// 	className: ".egg.MLandActivity",
	// },
].filter(action => (
	app.getAppName(action.packageName)
));

const name = "APP管家";
const icon = "./res/drawable/ic_phone_settings.png";

function appManager () {
	singleChoice({
		title: name,
		icon,
		itemList: actions,
		fn: startActivity,
	});
	require("./index")();
}

module.exports = {
	name,
	icon,
	summary: "广告相关权限管理",
	fn: appManager,
};
