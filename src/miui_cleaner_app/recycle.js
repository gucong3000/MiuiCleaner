const findClickableParent = require("./findClickableParent");
const requestSettings = require("./requestSettings");
const singleChoice = require("./singleChoice");
const instApk = require("./instApk");
const blur = require("./blur");

const marketPackageName = "com.xiaomi.market";
function clickMarketBtn (text) {
	const btn = selector().packageName(marketPackageName).text(text).findOne(0x1000);
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
	toastLog("正在查询回收站，请稍候");
	const pm = context.getPackageManager();
	return Array.from(
		pm.getInstalledApplications(android.content.pm.PackageManager.MATCH_UNINSTALLED_PACKAGES),
	).map(appInfo => {
		if (/\b(analytics|systemAdSolution)$/.test(appInfo.packageName) || app.getAppName(appInfo.packageName)) {
			return null;
		}
		return {
			appName: pm.getApplicationLabel(appInfo).toString(),
			packageName: appInfo.packageName,
			// versionCode: appInfo.versionCode,
			// versionName: appInfo.versionName,
			// dataDir: appInfo.dataDir,
			apk: appInfo.sourceDir,
			// publicSourceDir: appInfo.publicSourceDir,
			// deviceProtectedDataDir: appInfo.deviceProtectedDataDir,
		};
	}).filter(Boolean);
}

function recycle () {
	const appInfo = singleChoice("请选择要恢复的应用", getInstalledPackages().concat({ name: "其他" }));
	if (appInfo) {
		requestSettings({
			accessibility: true,
		});
		if (appInfo.apk) {
			instApk(appInfo.apk);
			console.log("正在恢复：", appInfo);
		} else {
			launchMarket();
		}
		blur();
		recycle();
	}
}

module.exports = recycle;
