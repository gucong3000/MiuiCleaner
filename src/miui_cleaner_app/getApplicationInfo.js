const pm = context.getPackageManager();
// https://developer.android.google.cn/reference/kotlin/android/content/pm/ApplicationInfo
// https://developer.android.google.cn/reference/kotlin/android/content/pm/PackageInfo
function getApplicationInfo (options) {
	let appInfo;
	let packageInfo;
	const getPackageInfo = () => packageInfo || (packageInfo = pm.getPackageInfo(options.packageName, 0));

	try {
		appInfo = pm.getApplicationInfo(options.packageName, android.content.pm.PackageManager.GET_SIGNING_CERTIFICATES);
	} catch (ex) {
		return null;
	}
	if (!options.appName) {
		const appName = pm.getApplicationLabel(appInfo).toString();
		if (appName === options.packageName) {
			if (!options.name && options.summary) {
				options.name = options.summary;
				options.summary = options.packageName;
			}
		} else {
			options.appName = appName;
		}
	}
	if (!options.signatures) {
		options.signatures = appInfo.signatures;
	}
	if (!options.loadIcon && appInfo.icon) {
		options.loadIcon = () => appInfo.loadIcon(pm);
	}
	options.getVersionName = () => getPackageInfo().versionName;
	options.getVersionCode = () => getPackageInfo().getLongVersionCode();
	return options;
}
module.exports = getApplicationInfo;
