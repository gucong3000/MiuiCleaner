const startActivity = require("./startActivity");

module.exports = [
	{
		name: "通知管理",
		fn: () => {
			return startActivity({
				packageName: "com.miui.notification",
				className: "miui.notification.management.activity.NotificationAppListActivity",
			});
		},
	},
	{
		name: "应用管理",
		fn: () => {
			return startActivity({
				packageName: "com.miui.securitycenter",
				className: "com.miui.appmanager.AppManagerMainActivity",
			});
		},
	},
	{
		name: "应用信息",
		fn: () => {
			return startActivity({
				packageName: "com.android.settings",
				className: ".applications.ManageApplications",
			});
		},

	},
];
