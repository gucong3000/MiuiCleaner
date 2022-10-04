const findClickableParent = require("./findClickableParent");
const singleChoice = require("./singleChoice");
const instApk = require("./instApk");
const appDesc = require("./appDesc");

const marketPackageName = "com.xiaomi.market";
function clickMarketBtn (text) {
	let btn;
	try {
		btn = selector().packageName(marketPackageName).text(text).findOne(0x1000);
	} catch (ex) {
		//
	}
	if (btn) {
		findClickableParent(btn).click();
		return btn;
	}
}

function launchMarket () {
	const opts = {
		packageName: marketPackageName,
		className: marketPackageName + ".ui.MarketTabActivity",
	};

	try {
		app.startActivity(opts);
	} catch (ex) {
		app.launch(marketPackageName);
	}

	clickMarketBtn("我的") && clickMarketBtn("系统应用管理");
}

function getInstalledPackages () {
	const pm = context.getPackageManager();
	return Array.from(
		pm.getInstalledApplications(android.content.pm.PackageManager.MATCH_UNINSTALLED_PACKAGES),
	).map(appInfo => {
		if (app.getAppName(appInfo.packageName)) {
			return null;
		}
		return {
			appName: pm.getApplicationLabel(appInfo).toString(),
			packageName: appInfo.packageName,
			summary: appDesc[appInfo.packageName] || "",
			// versionCode: appInfo.versionCode,
			// versionName: appInfo.versionName,
			// dataDir: appInfo.dataDir,
			apk: appInfo.sourceDir,
			// publicSourceDir: appInfo.publicSourceDir,
			// deviceProtectedDataDir: appInfo.deviceProtectedDataDir,
		};
	}).filter(Boolean).sort((app1, app2) => (
		app1.packageName.localeCompare(app2.packageName)
	)).concat(
		{
			name: "其他",
			fn: launchMarket,
			summary: "去应用商店下载其他小米官方应用",
		},
	);
}

function recycle () {
	singleChoice({
		title: "请选择要恢复的应用",
		itemList: {
			then: (resolve) => resolve(getInstalledPackages()),
		},
		fn: function (appInfo) {
			instApk(appInfo.apk);
			console.log("正在恢复：", appInfo);
		},
	});
	require("./index")();
}

module.exports = recycle;
