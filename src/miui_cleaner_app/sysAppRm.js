const findClickableParent = require("./findClickableParent");
const getApplicationInfo = require("./getApplicationInfo");
const multiChoice = require("./multiChoice");
const waitForBack = require("./waitForBack");
const settings = require("./settings");
const appDesc = require("./appDesc");
const dialogs = require("./dialogs");

const installerPackageName = "com.miui.packageinstaller";
const installerAppName = app.getAppName(installerPackageName);

const sysAppList = Object.keys(appDesc).map(packageName => ({
	packageName,
	summary: appDesc[packageName],
}));

function clickButton (button, text) {
	button = findClickableParent(button);
	if (button) {
		button.click();
	}
}

// 卸载“纯净模式”
function getInstaller (appList) {
	const packageInfo = getApplicationInfo({
		packageName: installerPackageName,
		summary: "降级安装v380，以便移除“纯净模式”",
	});
	if (!packageInfo || packageInfo.getVersionCode() < 400) {
		// 版本号小于400，则不含“纯净模式”
		return;
	}
	const fileName = "MiuiPackageInstaller.apk";
	const srcPath = "res/" + fileName;
	const copyPath = "/sdcard/Download/" + fileName;
	const installPath = "/data/local/tmp/" + fileName;
	files.copy(srcPath, copyPath);
	packageInfo.cmd = [
		`mv ${copyPath} ${installPath}`,
		"pm install -d -g " + installPath,
		"rm -rf " + installPath,
	].join("\n");
	appList.push(packageInfo);
	console.log(`发现${installerAppName}(${installerPackageName})，版本号${packageInfo.getVersionName()}，已释放版本号为v380的降级安装包到路径：${copyPath}`);
}

const whitelist = /^com\.(miui\.(voiceassist|personalassistant)|android\.(quicksearchbox|chrome))$/;
function getAppList () {
	const appList = sysAppList.filter(item => {
		if (!getApplicationInfo(item)) {
			return false;
		}
		if (item.checked == null) {
			item.checked = !whitelist.test(item.packageName);
		}
		// item.isSysApp = appInfo.flags & android.content.pm.ApplicationInfo.FLAG_SYSTEM;
		return true;
	});
	getInstaller(appList);
	return appList;
}

function installerHelper () {
	// 应用包安装程序选择界面，下次默认，不再提示
	// const isCheckBox = checkBox => (
	// 	checkBox.checkable() && !checkBox.checked() && /下次默认.*不再提示/.test(checkBox.text()) && /\bandroid\b/.test(checkBox.packageName())
	// );
	// 应用包安装程序选择界面，通过“应用包管理组件”运行
	const isInstallerSelect = btn => (
		installerAppName === btn.text() && /\bandroid\b/.test(btn.packageName())
	);
	// 应用包管理组件，确定、继续按钮
	const isContinueBtn = btn => (
		/\b(continue|ok)_button$/.test(btn.id()) && installerPackageName === btn.packageName()
	);
	clickButton(
		selector().filter(
			obj => isInstallerSelect(obj) || isContinueBtn(obj),
		).findOnce(),
	);
	setTimeout(installerHelper, 0x50);
}

function removeByInstaler (taskList) {
	const uninstallTaskList = taskList.filter(task => task.packageName !== installerPackageName);
	if (!uninstallTaskList.length) {
		return taskList;
	}

	toastLog(`尝试以常规权限卸载${uninstallTaskList.length}个应用`);
	let helper;
	return settings.set(
		"accessibilityServiceEnabled",
		true,
		"自动化卸载这些APP",
	).then(accessibilityServiceEnabled => {
		if (accessibilityServiceEnabled) {
			helper = threads.start(installerHelper);
		}
	}).then(() =>
		waitForBack(() => {
			uninstallTaskList.forEach(appInfo => {
				app.uninstall(appInfo.packageName);
			});
		}).then(() => {
			helper && helper.interrupt();
			return taskList;
		}),
	);
}

function removeByScript (tasks) {
	tasks = tasks.filter(
		appInfo => app.getAppName(appInfo.packageName),
	).map(appInfo => {
		return appInfo.cmd || "pm uninstall --user 0 " + appInfo.packageName;
	});
	if (!tasks.length) {
		return;
	}

	const shFilePath = "/sdcard/Download/MiuiCleaner.sh";
	tasks.unshift(`pm grant ${context.getPackageName()} android.permission.WRITE_SECURE_SETTINGS`);
	tasks.unshift("#!/bin/sh");
	tasks.push("rm -rf " + shFilePath);
	const script = tasks.join("\n") + "\n";
	files.write(shFilePath, script);
	let cmd = "sh " + shFilePath;
	try {
		shell(cmd, true);
		toastLog(`尝试以root权限卸载${tasks.length}个应用`);
		return;
	} catch (ex) {
		//
	}
	return settings.set("adbInput", true, "自动打开“USB调试(安全设置)”，让电脑端有权限卸载这些APP").then((adbInput) => {
		// if (!adbInput) {
		// 	toastLog("“USB调试(安全设置)”未打开，请打开后再试。");
		// 	return;
		// }
		cmd = "adb shell " + cmd;
		toastLog("正以等候电脑端自动执行：\t" + cmd);
		const timeout = Date.now() + 0x800 + tasks.length * 0x200;
		let fileExist;
		return new Promise((resolve) => {
			const timer = setInterval(() => {
				let wait;
				fileExist = files.exists(shFilePath);
				if (!fileExist) {
					toastLog("电脑端自动执行成功");
				} else if (Date.now() > timeout) {
					wait = dialogs.prompt(
						"等候电脑端自动执行超时，请打开本软件电脑端，或者在电脑手动执行命令：",
						cmd,
						{
							negative: false,
							cancelable: true,
						},
					).then(() => {
						if (!files.exists(shFilePath)) {
							toastLog("电脑端手动执行成功");
						} else {
							toastLog("电脑端手动执行失败");
						}
					});
				} else {
					return;
				}
				clearInterval(timer);
				resolve(wait);
			}, 0x200);
		});
	});
}

function sysAppRm () {
	const itemList = getAppList();
	multiChoice({
		title: "请选择要卸载的应用或功能",
		itemList,
	}).then(
		removeByInstaler,
	).then(
		removeByScript,
	).then(
		sysAppRm,
	).catch(console.error);
	require("./index")();
};

module.exports = {
	name: "预装APP卸载",
	summary: "卸载系统广告组件及随机预装的APP",
	icon: "./res/drawable/ic_phone_recovery.png",
	fn: sysAppRm,
};
