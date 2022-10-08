const pm = context.getPackageManager();
function getApplicationInfo (options) {
	let appInfo;
	try {
		appInfo = pm.getApplicationInfo(options.packageName, 0);
	} catch (ex) {
		return null;
	}
	if (!options.action || (!options.name && !options.appName)) {
		options.appName = pm.getApplicationLabel(appInfo).toString();
	}
	options.loadIcon = appInfo.icon && (() => appInfo.loadIcon(pm));
	return options;
}
module.exports = getApplicationInfo;
