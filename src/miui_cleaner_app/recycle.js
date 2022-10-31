const singleChoice = require("./singleChoice");
const serviceMgr = require("./serviceMgr");
const settings = require("./settings");
const instApk = require("./instApk");
const appDesc = require("./appDesc");

const marketPackageName = "com.xiaomi.market";

function launchMarket () {
	return settings.set(
		"accessibilityServiceEnabled",
		true,
		"自动打开“应用商店”的“系统应用管理”",
	).then(accessibilityServiceEnabled => {
		if (accessibilityServiceEnabled) {
			return serviceMgr({
				packageName: marketPackageName,
				action: ".ui.CommonWebActivity",
				name: "系统应用管理",
			});
		} else {
			return app.launchPackage(marketPackageName);
		}
	});
}

function getInstalledPackages () {
	const pm = context.getPackageManager();
	return Array.from(
		pm.getInstalledApplications(android.content.pm.PackageManager.MATCH_UNINSTALLED_PACKAGES),
	).map(appInfo => {
		if (app.getAppName(appInfo.packageName)) {
			return null;
		}
		const summary = appDesc[appInfo.packageName] || "";
		let appName = pm.getApplicationLabel(appInfo).toString();
		if (appName === appInfo.packageName) {
			appName = null;
		}
		return {
			summary: appName ? summary : appInfo.packageName,
			packageName: appInfo.packageName,
			loadIcon: appInfo.icon && (() => appInfo.loadIcon(pm)),
			apk: appInfo.sourceDir,
			name: appName || summary,
			appName,
		};
	}).filter(Boolean).sort((app1, app2) => (
		app1.packageName.localeCompare(app2.packageName)
	)).concat({
		name: "其他",
		loadIcon: () => pm.getApplicationInfo(marketPackageName, 0).loadIcon(pm),
		fn: launchMarket,
		summary: "去应用商店下载其他小米官方应用",
	});
}
let requestInstallPackages;
function recycle () {
	singleChoice({
		title: "请选择要恢复的应用",
		itemList: {
			then: (...args) => Promise.resolve(getInstalledPackages()).then(...args),
		},
		fn: function (appInfo) {
			if (!requestInstallPackages) {
				requestInstallPackages = settings.set("requestInstallPackages", true, "打开应用安装权限");
			}
			return requestInstallPackages.then(() => {
				instApk(appInfo.apk);
				console.log("正在恢复：", appInfo);
			});
		},
	});
	require("./index")();
}

module.exports = {
	name: "回收站",
	summary: "恢复已卸载的APP",
	icon: "./res/drawable/ic_recovery.png",
	fn: recycle,
};
