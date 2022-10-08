const pm = context.getPackageManager();
// https://developer.android.google.cn/reference/kotlin/android/content/pm/ApplicationInfo
// https://developer.android.google.cn/reference/kotlin/android/content/pm/PackageInfo
function getApplicationInfo (options) {
	let appInfo;
	let packageInfo;
	const getPackageInfo = () => packageInfo || (packageInfo = pm.getPackageInfo(options.packageName, 0));

	try {
		appInfo = pm.getApplicationInfo(options.packageName, 0);
	} catch (ex) {
		return null;
	}
	if (!options.action || (!options.name && !options.appName)) {
		options.appName = pm.getApplicationLabel(appInfo).toString();
	}
	options.loadIcon = appInfo.icon && (() => appInfo.loadIcon(pm));
	options.getVersionName = () => getPackageInfo().versionName;
	options.getVersionCode = () => getPackageInfo().getLongVersionCode();
	return options;
}
module.exports = getApplicationInfo;
