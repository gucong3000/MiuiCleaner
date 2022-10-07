const waitForBack = require("./waitForBack");
const serviceMgr = require("./serviceMgr");
const project = require("./project.json");
const dialogs = require("./dialogs");

const settingsPackageName = "com.android.settings";
const settingsPrototype = Object.create(android.provider.Settings);
settingsPrototype.keys = function () {
	return Object.getOwnPropertyNames(this).sort();
};
settingsPrototype.has = Object.prototype.hasOwnProperty;
settingsPrototype.get = function (key) {
	if (this.has(key)) {
		return this[key];
	}
};
const requestCache = {};
function lazyAction (key, action) {
	let resolve = requestCache[key];
	if (!resolve) {
		resolve = Promise.resolve();
	}
	if (action) {
		resolve = resolve.then(action);
	}
	requestCache[key] = resolve;
	return resolve;
}

settingsPrototype.set = function (key, expectValue, reason) {
	if (this.has(key)) {
		this[key] = expectValue;
		if ((this[key] !== expectValue)) {
			const depend = settingProperties[key].depend;
			if (depend && expectValue) {
				lazyAction(
					key,
					() => this.set(depend, expectValue, reason),
				);
			}
			lazyAction(
				key,
				() => requestSettings(key, expectValue, reason),
			);
		}
		lazyAction(
			key,
			() => this[key],
		);
	}
	return lazyAction(key);
};
settingsPrototype.forEach = function (callbackFn, thisArg) {
	this.keys().forEach(
		(key) => {
			if (key === "forEach") {
				return;
			}
			callbackFn.call(thisArg || this, settings[key], key, settings);
		},
		thisArg,
	);
};
const settings = Object.create(settingsPrototype);

const actions = {
	ACTION_MANAGE_UNKNOWN_APP_SOURCES: /^requestInstallPackages$/,
	ACTION_MANAGE_OVERLAY_PERMISSION: /^drawOverlays$/,
	ACTION_MANAGE_WRITE_SETTINGS: /^writeSettings$/,
	ACTION_DEVICE_INFO_SETTINGS: /^development$/,
	ACTION_APPLICATION_DEVELOPMENT_SETTINGS: /^adb/,
};

function requestSettings (key, expectValue, reason) {
	if (key === "accessibilityServiceEnabled") {
		reason = reason ? `，以便“${project.name}”能${reason}` : "";
		return dialogs.confirm(
			`请在下个页面，点击“已下载的服务”，然后${expectValue ? "打开" : "关闭"}“${project.name}”的无障碍服务开关${reason}。`,
			{
				title: "权限请求",
			},
		).then((confirm) => {
			return confirm && waitForBack(() => {
				auto.waitFor();
			});
		});
	}
	for (const actionName in actions) {
		if (actions[actionName].test(key)) {
			return settings.set(
				"accessibilityServiceEnabled",
				true,
				reason,
			).then(accessibilityServiceEnabled => (
				accessibilityServiceEnabled && serviceMgr({
					packageName: settingsPackageName,
					checked: expectValue,
					action: actionName,
				})
			));
		}
	}
}
function tryCmd (cmd, root = true) {
	try {
		shell(cmd, root);
	} catch (ex) {
		if (root) {
			return tryCmd(cmd, false);
		}
	}
}

// function switchACheckBox (expect = true, packageName = settingsPackageName) {
// 	let checkBox = selector().packageName(packageName).checkable(true).findOne();
// 	let value = checkBox.checked();
// 	if (value === expect) {
// 		return expect;
// 	} else {
// 		checkBox = findClickableParent(checkBox);
// 		if (checkBox) {
// 			checkBox.click();
// 			value = expect;
// 		}
// 	}
// 	return value;
// }

function pmPermission (key, permission) {
	// pm grant org.autojs.autoxjs.v6 android.permission.WRITE_SETTINGS
	// pm grant org.autojs.autoxjs.v6 android.permission.WRITE_SECURE_SETTINGS
	// pm grant org.autojs.autoxjs.v6 android.permission.SYSTEM_ALERT_WINDOW
	// pm grant com.github.gucong3000.miui.cleaner android.permission.WRITE_SETTINGS
	// pm grant com.github.gucong3000.miui.cleaner android.permission.WRITE_SECURE_SETTINGS
	// pm grant com.github.gucong3000.miui.cleaner android.permission.SYSTEM_ALERT_WINDOW
	return (expectValue) => {
		const value = settings[key];
		if (expectValue !== value) {
			tryCmd(`pm ${expectValue ? "grant" : "revoke"} ${context.getPackageName()} android.permission.${permission}`);
		}
	};
}

const accessServicesName = context.getPackageName() + "/com.stardust.autojs.core.accessibility.AccessibilityService";
const settingProperties = {
	// rhinoVersion: {
	// 	get: () => org.mozilla.javascript.Context.getCurrentContext().getImplementationVersion(),
	// },
	requestInstallPackages: {
		enumerable: true,
		get: () => context.getPackageManager().canRequestPackageInstalls(),
		// get: () => Boolean(context.checkCallingOrSelfPermission("android.permission.REQUEST_INSTALL_PACKAGES")),
		set: pmPermission("requestInstallPackages", "REQUEST_INSTALL_PACKAGES"),
	},
	writeSettings: {
		enumerable: true,
		get: () => settings.System.canWrite(context),
		// get: () => Boolean(context.checkCallingOrSelfPermission("android.permission.WRITE_SETTINGS")),
		set: pmPermission("writeSettings", "WRITE_SETTINGS"),
	},
	writeSecureSettings: {
		enumerable: true,
		get: () => Boolean(context.checkCallingOrSelfPermission("android.permission.WRITE_SECURE_SETTINGS")),
		set: pmPermission("writeSecureSettings", "WRITE_SECURE_SETTINGS"),
	},
	drawOverlays: {
		enumerable: true,
		get: () => settings.canDrawOverlays(context),
		// get: () => Boolean(context.checkCallingOrSelfPermission("android.permission.SYSTEM_ALERT_WINDOW")),
		set: pmPermission("drawOverlays", "SYSTEM_ALERT_WINDOW"),
	},
	accessibilityServiceEnabled: {
		enumerable: true,
		get: () => settings.accessibility &&
			settings.accessibilityServices.has(accessServicesName) &&
			org.autojs.autojs.tool.AccessibilityServiceTool.isAccessibilityServiceEnabled(context),
		set: (value) => {
			if (value) {
				settings.accessibilityServices.add(accessServicesName);
			} else {
				settings.accessibilityServices.delete(accessServicesName);
			}
		},
	},
	adbInput: {
		enumerable: true,
		depend: "adb",
		get: () => settings.adb && (getAdbInput() || getAdbInput()),
		set: (expectValue) => {
			const value = settings.adbInput;
			if (expectValue !== value) {
				enableDependSetting("adb", expectValue);
				tryCmd("setprop persist.security.adbinput " + (expectValue ? 1 : 0));
			}
		},
	},
};

function getAdbInput () {
	return Boolean(tryCmd("getprop persist.security.adbinput", false) - 0);
}

function enableDependSetting (depend, value) {
	if (depend && value) {
		settings[depend] = Boolean(value);
	}
}
// 基于系统设置的选项
// https://developer.android.google.cn/reference/android/provider/Settings.Global
function defineSettingProperty ({
	space = "Global",
	type = "Int",
	key,
	depend,
	get = Boolean,
	set = value => value ? 1 : 0,
}) {
	const propertyName = key
		.replace(/^enabled_|(_settings?)?_(enabled|status|pref)$/, "")
		.replace(/_(ad$|\w)/g, s => s.slice(1).toUpperCase());
	const descriptor = {
		enumerable: true,
		get: getter,
		set: setter,
		space,
		depend,
	};
	settingProperties[propertyName] = descriptor;
	if (!depend) {
		depend = space === "Secure" ? "writeSecureSettings" : "writeSettings";
	}
	function getter () {
		const value = settings[space]["get" + type](context.getContentResolver(), key);
		return get ? get(value) : value;
	}
	function setter (expectValue) {
		expectValue = set ? set(expectValue) : expectValue;
		enableDependSetting(depend, expectValue);
		try {
			settings[space]["put" + type](context.getContentResolver(), key, expectValue);
		} catch (ex) {
			// console.error(`将${propertyName}设置为${expectValue}时失败\n${ex.message}`);
		}
	}
}

// 开发者选项
defineSettingProperty({
	key: "development_settings_enabled",
});

// `USB调试`，既ADB权限
defineSettingProperty({
	key: "adb_enabled",
	depend: "development",
});

// 小米帐号 → 关于小米帐号 → 系统广告 → 系统工具广告
defineSettingProperty({
	key: "passport_ad_status",
	type: "String",
	get: value => !/^OFF$/i.test(value),
	set: value => value ? "ON" : "OFF",
});

// 系统安全 → 广告服务 → 个性化广告推荐
defineSettingProperty({
	key: "personalized_ad_enabled",
});

// 无障碍服务列表
defineSettingProperty({
	space: "Secure",
	type: "String",
	key: "enabled_accessibility_services",
	get: null,
	set: null,
});

((accessibilityServices) => {
	const {
		set,
		get,
	} = accessibilityServices;
	let services;
	const proxy = {
		...String.prototype,
		toString: () => Array.from(services).join(":"),
	};
	proxy.inspect = proxy.toJSON = proxy.toString;

	Object.getOwnPropertyNames(Set.prototype).forEach(propertyName => {
		proxy[propertyName] = (...args) => {
			const result = services[propertyName](...args);
			set(proxy.toString());
			settings.accessibility = true;
			return result;
		};
	});

	accessibilityServices.get = () => {
		if (!services) {
			services = new Set(get().split(/\s*:\s*/g));
		}
		return Object.create(proxy);
	};
	delete accessibilityServices.set;
})(settingProperties.accessibilityServices);

[
	// 无障碍服务开关
	"accessibility_enabled",
	// 系统安全 → 网页链接调用服务
	"http_invoke_app",
	// 系统安全 →加入“用户体验改进计划”
	"upload_log_pref",
	// 系统安全 → 自动发送诊断数据
	"upload_debug_log_pref",
].forEach(key => {
	defineSettingProperty({
		space: "Secure",
		key,
	});
});

Object.defineProperties(
	settings,
	settingProperties,
);

module.exports = settings;
