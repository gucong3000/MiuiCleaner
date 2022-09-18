/**
 * 调用 APK 安装界面
 */
function instApk (apk) {
	try {
		app.viewFile(apk);
	} catch (ex) {
		return false;
	}
	return true;
}

module.exports = instApk;
