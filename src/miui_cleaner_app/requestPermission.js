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
	options = {
		accessibility: true,
		...options,
	};

	threads.start(() => {
		if (options.accessibility) {
			auto.waitFor();
		}
		if (options.drawOverlay) {
			setDrawOverlay();
		}
		if (options.captureScreen) {
			setCaptureScreen();
		}
	});
}

function clickCheckBox (expect, packageName) {
	let checkBox = selector().packageName(packageName).className("CheckBox").findOne();
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

/**
 * 请求或自动化获得截图权限
 * @returns {bool}
 */
function setDrawOverlay () {
	let value = floaty.checkPermission();
	if (!value) {
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
 * 查询目前是否有截图权限
 * @returns  {bool}
 */
function getCaptureScreen () {
	try {
		images.captureScreen();
	} catch (ex) {
		return false;
	}
	return true;
}

/**
 * 请求或自动化获得截图权限
 * @returns {bool}
 */
function setCaptureScreen () {
	let value = getCaptureScreen();

	if (!value) {
		// 先打开悬浮窗权限，因为MIUI可能有Bug，截图权限授权弹窗可能有时候不显示，先给悬浮窗权限就没问题了。
		setDrawOverlay();

		// 尝试使用“无障碍”权限获得的自动化操作能力自动点击，拿到截图权限
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
