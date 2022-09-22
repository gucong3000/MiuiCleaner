// https://www.coder.work/article/1171167

const findClickableParent = require("./findClickableParent");

/**
 * 请求 APP 的系统权限
 * @param {object} options 包名
 * @param {bool} options.accessibility 无障碍、可访问性
 * @param {bool} options.drawOverlay 悬浮窗、允许显示在其他应用的上层
 * @param {bool} options.captureScreen 截图
 */
function requestPermission (options = {}) {
	if (options.accessibility) {
		enableAccessibility();
	}
	if (options.drawOverlay) {
		enableDrawOverlay();
	}
	if (options.captureScreen) {
		enableCaptureScreen();
	}
	if (options.development) {
		enableDevelopment();
	}
	if (options.adb) {
		enableADB();
	}
}

function clickCheckBox (expect, packageName) {
	let checkBox = selector().packageName(packageName).checkable(true).findOne();
	const value = checkBox.checked();
	if (value === expect) {
		return expect;
	} else {
		checkBox = findClickableParent(checkBox);
		if (checkBox) {
			checkBox.click();
			return expect;
		}
	}
	return value;
}

function enableAccessibility () {
	auto.waitFor();
}

/**
 * 开启悬浮窗权限
 * @returns {bool}
 */
function enableDrawOverlay () {
	let value = floaty.checkPermission();
	if (!value) {
		enableAccessibility();
		floaty.requestPermission();
		try {
			value = clickCheckBox(true, "com.android.settings");
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
	return android.provider.Settings.Global.getInt(context.getContentResolver(), key);
}

function findBtnInView (intent, text) {
	enableAccessibility();
	context.startActivity(new android.content.Intent(android.provider.Settings[intent]));
	sleep(0x200);
	const listView = selector().packageName("com.android.settings").scrollable(true).findOne();
	sleep(0x200);
	let btn;
	do {
		btn = selector().packageName("com.android.settings").text(text).findOnce();
		if (btn) {
			break;
		} else {
			sleep(0x200);
		}
	} while (listView.scrollForward());
	return findClickableParent(btn);
}

/**
 * 打开开发者选项
 * @returns {bool}
 */
function enableDevelopment () {
	let value = getGlobalSetting("development_settings_enabled");
	if (!value) {
		const btnMIUI = findBtnInView("ACTION_DEVICE_INFO_SETTINGS", "MIUI 版本");
		if (btnMIUI) {
			for (let i = 0; i < 9; i++) {
				btnMIUI.click();
			}
			value = true;
		}
	}
	return value;
}

/**
 * 打开`USB调试`既ADB权限
 * @returns {bool}
 */
function enableADB () {
	let value = getGlobalSetting("adb_enabled");
	if (!value) {
		enableDevelopment();
		const btnUSB = findBtnInView("ACTION_APPLICATION_DEVELOPMENT_SETTINGS", "USB 调试");
		if (btnUSB) {
			btnUSB.click();
			let btnAllow;
			do {
				const checkBox = selector().id("check_box").packageName("com.miui.securitycenter").findOnce();
				if (checkBox && !checkBox.checked()) {
					findClickableParent(checkBox).click();
				}
				btnAllow = selector().id("intercept_warn_allow").packageName("com.miui.securitycenter").findOne(0x200);
				if (btnAllow) {
					findClickableParent(btnAllow).click();
				}
			} while (btnAllow);
			back();
			value = true;
		}
	}
	return value;
}

/**
 * 开启截图权限
 * @returns {bool}
 */
function enableCaptureScreen () {
	let value = true;
	try {
		images.captureScreen();
	} catch (ex) {
		value = false;
	}

	if (!value) {
		// 尝试使用“无障碍”权限获得的自动化操作能力自动点击，拿到截图权限
		enableAccessibility();
		// 先打开悬浮窗权限，因为MIUI可能有Bug，截图权限授权弹窗可能有时候不显示，先给悬浮窗权限就没问题了。
		enableDrawOverlay();
		const thread = threads.start(function () {
			try {
				const packageName = "com.android.systemui";
				clickCheckBox(true, packageName);
				findClickableParent(selector().packageName(packageName).text("立即开始").findOne()).click();
			} catch (ex) {
				//
			}
		});
		value = images.requestScreenCapture();
		thread.interrupt();

		if (!value) {
			toastLog("请打开“截图”权限，以便能能识别开关");
		}
	}
	return value;
}

module.exports = requestPermission;
