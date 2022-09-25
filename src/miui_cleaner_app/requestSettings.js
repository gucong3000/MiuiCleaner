const findClickableParent = require("./findClickableParent");
const project = require("./project.json");
const settingsPackageName = "com.android.settings";
const resolver = context.getContentResolver();
const Settings = android.provider.Settings;

/**
 * 请求系统权限或设置
 * @param {Object} options 选项
 * @param {boolean} options.writeSettings 系统设置修改权限
 * @param {boolean} options.accessibility 无障碍、可访问性权限
 * @param {boolean} options.drawOverlay 悬浮窗、允许显示在其他应用的上层权限
 * @param {boolean} options.captureScreen 截图权限
 * @param {boolean} options.development 开启开发者选项
 * @param {boolean} options.adb 开启`USB安装`权限
 * @param {boolean} options.adbInstall 打开`USB安装`权限
 * @returns {Object} 成功与否
 * @returns {boolean} return.writeSettings 系统设置修改权限
 * @returns {boolean} return.accessibility 无障碍、可访问性
 * @returns {boolean} return.drawOverlay 悬浮窗、允许显示在其他应用的上层
 * @returns {boolean} return.captureScreen 截图权限
 * @returns {boolean} return.development 开启开发者选项
 * @returns {boolean} return.adb 开启`USB调试`，既ADB权限
 * @returns {boolean} return.adbInstall 开启`USB安装`权限
 */
function requestSettings (options = {}) {
	const result = {};
	if (options.writeSettings) {
		result.writeSettings = enableWriteSettings();
	}
	if (options.accessibility) {
		result.accessibility = enableAccessibility();
	}
	if (options.drawOverlay) {
		result.drawOverlay = enableDrawOverlay();
	}
	if (options.captureScreen) {
		result.captureScreen = enableCaptureScreen();
	}
	if (options.development) {
		result.development = enableDevelopment();
	}
	if (options.adb) {
		result.adb = enableADB();
	}
	if (options.adbInstall) {
		result.adbInstall = enableAdbInstall();
	}
	return result;
}

function switchACheckBox (expect, packageName) {
	packageName = packageName || settingsPackageName;
	let checkBox = selector().packageName(packageName).checkable(true).findOne();
	let value = checkBox.checked();
	if (value === expect) {
		return expect;
	} else {
		checkBox = findClickableParent(checkBox);
		if (checkBox) {
			checkBox.click();
			value = expect;
		}
	}
	return value;
}

function getAccessibility () {
	try {
		selector().id("null").findOnce();
	} catch (ex) {
		return false;
	}
	return true;
}

/**
 * 向系统中添加新的无障碍服务
 * @param {String} serviceName 服务的名称
 * @returns {boolean} 成功与否
 */
function addAccessibilityServices (serviceName) {
	if (enableWriteSettings()) {
		const key = Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES;
		const enabledServices = new Set(Settings.Secure.getString(resolver, key).split(/\s*:+\s*/g));
		enabledServices.add(serviceName);
		try {
			Settings.Secure.putString(resolver, key, Array.from(enabledServices).join(":"));
			Settings.Secure.putInt(resolver, Settings.Secure.ACCESSIBILITY_ENABLED, 1);
		} catch (ex) {
			return false;
		}
		return true;
	}
	return false;
}

/**
 * 开启无障本软件的无障碍服务
 * @returns {boolean} 成功与否
 */
function enableAccessibility () {
	let value = getAccessibility();
	if (!value) {
		if (addAccessibilityServices(context.getPackageName() + "/com.stardust.autojs.core.accessibility.AccessibilityService")) {
			value = getAccessibility();
		}
		if (!value && dialogs.confirm("权限请求", `请在下个页面，点击“已下载的服务”，然后打开“${project.name}”的无障碍服务开关`)) {
			value = auto.waitFor();
		}
	}
	return value;
}

/**
 * 检查是否有系统设置修改权限
 * @returns {boolean}
 */
function getWriteSettings () {
	return Settings.System.canWrite(context);
}

function actionManageWriteSettings () {
	app.startActivity({
		action: Settings.ACTION_MANAGE_WRITE_SETTINGS,
		data: "package:" + context.getPackageName(),
	});
}

/**
 * 系统设置修改权限
 * @returns {boolean} 成功与否
 */
function enableWriteSettings () {
	let value = getWriteSettings();
	if (!value) {
		if (getAccessibility()) {
			actionManageWriteSettings();
			try {
				value = switchACheckBox(true);
			} catch (ex) {
				//
			}
			if (value) {
				back();
			}
		} else if (dialogs.confirm("权限请求", "请给予系统设置修改权限，以便关闭广告")) {
			actionManageWriteSettings();
			do {
				value = getWriteSettings();
				sleep(0x200);
			} while (!value);
		}
	}
	return value;
}

/**
 * 悬浮窗权限
 * @returns {boolean} 成功与否
 */
function enableDrawOverlay () {
	let value = floaty.checkPermission();
	if (!value) {
		enableAccessibility();
		floaty.requestPermission();
		try {
			value = switchACheckBox(true);
		} catch (ex) {
			toastLog("请打开“悬浮窗”权限，以便自动化操作");
		}
		if (value) {
			back();
		}
	}
	return value;
}

/**
 * 获取Android配置信息
 * @param {String} key 配置项名称
 * @returns {Int}
 */
function getGlobalSetting (key) {
	// https://developer.android.google.cn/reference/android/provider/Settings.Global
	return Settings.Global.getInt(resolver, key);
}

/**
 * 写入Android配置信息
 * @param {String} key 配置项名称
 * @param {Int} key 配置值
 * @returns {boolean}
 */
function putGlobalSetting (key, value) {
	return enableWriteSettings() && Settings.Global.putInt(resolver, key, value);
}

/**
 * 打开开发者选项
 * @returns {boolean} 成功与否
 */
function enableDevelopment () {
	const key = "development_settings_enabled";
	let value = getGlobalSetting(key);
	if (!value) {
		value = putGlobalSetting(key, 1);
	}
	return value;
}

/**
 * 打开`USB调试`，既ADB权限
 * @returns {boolean} 成功与否
 */
function enableADB () {
	const key = "adb_enabled";
	let value = getGlobalSetting(key);
	if (!value) {
		enableDevelopment();
		value = putGlobalSetting(key, 1);
	}
	return value;
}

function switchCheckBox (linear, expect) {
	const checkBox = linear.findOne(selector().packageName(settingsPackageName).checkable(true));
	if (checkBox.checked() === expect) {
		return expect;
	} else {
		linear.click();
		sleep(0x200);
	}
	let btnAccept;
	do {
		btnAccept = selector().id("accept").packageName("com.miui.securitycenter").findOnce();
		if (btnAccept && btnAccept.clickable() && btnAccept.click()) {
			sleep(0x200);
		}
	} while (btnAccept);
	return switchCheckBox(linear, expect);
}

function clickCheckBoxInView (listView, text, expect) {
	let textView;
	do {
		sleep(0x200);
		textView = selector().packageName(settingsPackageName).text(text).findOnce();
	} while (!textView && listView.scrollForward());
	const linear = findClickableParent(textView);
	return switchCheckBox(
		linear,
		expect,
	);
}

function actionDevelopmentSettings () {
	context.startActivity(new android.content.Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS));
}

/**
 * 打开 ADB 安装 apk 文件的权限
 * @returns {boolean} 成功与否
 */
function enableAdbInstall () {
	enableADB();
	try {
		shell("setprop persist.security.adbinput 1", true);
	} catch (ex) {
		// console.log(files.read("/data/data/com.miui.securitycenter/shared_prefs/remote_provider_preferences.xml"));
	}

	if (enableAccessibility()) {
		actionDevelopmentSettings();
		const listView = selector().packageName(settingsPackageName).scrollable(true).findOne();
		// permcenter_install_intercept_enabled
		return clickCheckBoxInView(listView, "允许通过USB安装应用", true) &&
			(shell("getprop persist.security.adbinput").result.trim() === "1" || clickCheckBoxInView(listView, "允许通过USB调试修改权限或模拟点击", true)) &&
			back();
	} else if (dialogs.confirm("权限请求", "请在下个页面，打开“USB安装”和“USB调试（安全设置）”两个开关，以便电脑端可以执行您选定的操作。")) {
		actionDevelopmentSettings();
	}
}
enableAdbInstall();

/**
 * 开启截图权限
 * @returns {boolean} 成功与否
 */
function enableCaptureScreen () {
	let value = true;
	try {
		images.captureScreen();
	} catch (ex) {
		value = false;
	}

	if (!value) {
		// 先打开悬浮窗权限，因为MIUI可能有Bug，截图权限授权弹窗可能有时候不显示，先给悬浮窗权限就没问题了。
		enableDrawOverlay();
		value = images.requestScreenCapture();
		if (!value) {
			toastLog("请打开“截图”权限，以便能能识别开关");
		}
	}
	return value;
}

module.exports = requestSettings;
