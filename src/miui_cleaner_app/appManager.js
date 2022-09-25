const startActivity = require("./startActivity");

module.exports = [
	{
		name: "自启动管理",
		packageName: "com.miui.securitycenter",
		className: "com.miui.permcenter.autostart.AutoStartManagementActivity",
	},
	{
		name: "通知管理",
		packageName: "com.miui.notification",
		className: "miui.notification.management.activity.NotificationAppListActivity",
	},
	// {
	// 	name: "应用管理",
	// 	packageName: "com.miui.securitycenter",
	// 	className: "com.miui.appmanager.AppManagerMainActivity",
	// },
	// {
	// 	name: "应用升级",
	// 	packageName: "com.xiaomi.market",
	// 	className: ".ui.UpdateListActivity",
	// },
	{
		name: "应用卸载",
		packageName: "com.miui.cleanmaster",
		className: "com.miui.optimizecenter.deepclean.installedapp.InstalledAppsActivity",
	},
	{
		name: "应用信息",
		packageName: "com.android.settings",
		className: ".applications.ManageApplications",
	},
].map(action => {
	return app.getAppName(action.packageName)
		? {
			name: action.name,
			fn: () => startActivity({
				packageName: action.packageName,
				className: action.className,
			}),
		}
		: null;
}).filter(Boolean);
