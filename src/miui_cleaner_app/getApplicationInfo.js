// const PackageManager = android.content.pm.PackageManager;
const pm = context.getPackageManager();
// https://developer.android.google.cn/reference/kotlin/android/content/pm/ApplicationInfo
// https://developer.android.google.cn/reference/kotlin/android/content/pm/PackageInfo
function getApplicationInfo (options) {
	let appInfo;
	let packageInfo;
	// const getPackageInfo = () => packageInfo || (packageInfo = pm.getPackageInfo(options.packageName, PackageManager.GET_SIGNING_CERTIFICATES));
	const getPackageInfo = () => packageInfo || (packageInfo = pm.getPackageInfo(options.packageName, 0));

	try {
		appInfo = pm.getApplicationInfo(options.packageName, 0);
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

	// if (!options.getSignature) {
	// 	options.getSignature = () => getPackageInfo().signingInfo.getApkContentsSigners();
	// }
	if (!options.loadIcon && appInfo.icon) {
		options.loadIcon = () => appInfo.loadIcon(pm);
	}
	options.getVersionName = () => {
		let versionName = getPackageInfo().versionName;
		if (options.packageName === "com.miui.packageinstaller") {
			versionName = versionName.replace(/^\d+(?=-)/, () => Array.from(String(packageInfo.getLongVersionCode())).join("."));
		}
		return versionName;
	};
	options.getVersionCode = () => getPackageInfo().getLongVersionCode();
	options.getUpdateTime = () => getPackageInfo().lastUpdateTime;
	return options;
}
module.exports = getApplicationInfo;

// console.log(
// 	getApplicationInfo({
// 		packageName: "org.autojs.autoxjs.v6",
// 	}),
// );

// const apkPath = "/data/app/org.autojs.autoxjs.v6-XPge4R-XoervO0iNge1BhQ==/base.apk";

// const apkPath = "/storage/emulated/0/Android/data/org.autojs.autoxjs.v6/files/Download/GeometricWeather.3.013_pub-2.apk";
// const info = pm.getPackageArchiveInfo(
// 	apkPath,
// 	PackageManager.GET_SIGNING_CERTIFICATES,
// );
// const appInfo = info.applicationInfo;

// appInfo.sourceDir = apkPath;
// appInfo.publicSourceDir = apkPath;
// console.log(
// 	appInfo.loadLabel(pm).toString(),
// );
// console.log(
// 	appInfo.packageName,
// );
// console.log(
// 	appInfo.loadLabel(pm).toString(),
// );

// const zipFile = $zip.open(apkPath);
// log(zipFile.getPath());
// log();
// zipFile.getFileHeaders().forEach(file => {
// 	const fileName = file.getFileName();
// 	if (/^META-INF\/.+?\..*SA$/i.test(fileName)) {
// 		console.log(fileName);
// 		console.log(file.getSignature());
// 	}
// });
