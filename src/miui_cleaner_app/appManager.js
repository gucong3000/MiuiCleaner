const startActivity = require("./startActivity");
const singleChoice = require("./singleChoice");

const actions = [
	{
		name: "自启动管理",
		summary: "自启动及后台运行权限管理",
		packageName: "com.miui.securitycenter",
		className: "com.miui.permcenter.autostart.AutoStartManagementActivity",
	},
	{
		name: "通知管理",
		summary: "通知栏、悬浮提示、图标角标的管理",
		packageName: "com.miui.notification",
		className: "miui.notification.management.activity.NotificationAppListActivity",
	},
	{
		name: "APP卸载",
		summary: "APP的批量删除",
		packageName: "com.miui.cleanmaster",
		className: "com.miui.optimizecenter.deepclean.installedapp.InstalledAppsActivity",
	},
	{
		name: "APP管理",
		summary: "手机管家的应用管理功能",
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
		packageName: "com.android.settings",
		className: ".applications.ManageApplications",
	},
].filter(action => (
	app.getAppName(action.packageName)
));

function appManager () {
	singleChoice({
		title: "应用管家",
		itemList: actions,
		fn: function (item) {
			startActivity(item);
		},
	});
	require("./index")();
}

module.exports = appManager;
