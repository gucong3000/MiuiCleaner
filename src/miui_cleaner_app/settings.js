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
			if (expectValue) {
				const space = settingProperties[key].space;
				if (((space && space !== "Secure") || /^accessibility/.test(key)) && !this.writeSettings && this.accessibilityServiceEnabled) {
					lazyAction(
						key,
						() => this.set("writeSettings", expectValue, reason),
					);
				}
				const depend = settingProperties[key].depend;
				if (depend && !this[depend]) {
					lazyAction(
						key,
						() => this.set(depend, expectValue, reason),
					);
				}
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
		reason = reason ? `????????????${project.name}??????${reason}` : "";
		return dialogs.confirm(
			`????????????????????????????????????????????????????????????${expectValue ? "??????" : "??????"}???${project.name}???????????????????????????${reason}???`,
			{
				title: "????????????",
			},
		).then((confirm) => {
			return confirm && waitForBack(() => {
				if (expectValue) {
					try {
						auto();
					} catch (ex) {
						//
					}
				} else {
					app.startActivity(new android.content.Intent(settings.ACTION_ACCESSIBILITY_SETTINGS));
				}
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
		return shell(cmd, root);
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
	// grantRuntimePermission
	// revokeRuntimePermission
	return (expectValue) => {
		tryCmd(`pm ${expectValue ? "grant" : "revoke"} ${context.getPackageName()} android.permission.${permission}`, expectValue);
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
		get: () => {
			if (!context.checkCallingOrSelfPermission("android.permission.WRITE_SECURE_SETTINGS")) {
				try {
					settings.Secure.putInt(context.getContentResolver(), "accessibility_enabled", 1);
				} catch (ex) {
					return false;
				}
			}
			return true;
		},
		set: pmPermission("writeSecureSettings", "WRITE_SECURE_SETTINGS"),
	},
	drawOverlays: {
		enumerable: true,
		get: () => settings.canDrawOverlays(context),
		// get: () => Boolean(context.checkCallingOrSelfPermission("android.permission.SYSTEM_ALERT_WINDOW")),
		set: pmPermission("drawOverlays", "SYSTEM_ALERT_WINDOW"),
	},
	accessibilityServiceEnabled: {
		depend: "accessibility",
		enumerable: true,
		get: () => Boolean(auto.service),
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
			enableDependSetting("adb", expectValue);
			tryCmd("setprop persist.security.adbinput " + (expectValue ? 1 : 0));
		},
	},
};

function getAdbInput () {
	return Boolean(tryCmd("getprop persist.security.adbinput", false).result - 0);
}

function enableDependSetting (depend, value) {
	if (depend && value) {
		settings[depend] = Boolean(value);
	}
}
// ???????????????????????????
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
		depend,
		space,
		get: () => {
			const value = settings[space]["get" + type](context.getContentResolver(), key);
			return get ? get(value) : value;
		},
		set: (expectValue) => {
			expectValue = set ? set(expectValue) : expectValue;
			enableDependSetting(depend, expectValue);
			try {
				settings[space]["put" + type](context.getContentResolver(), key, expectValue);
			} catch (ex) {
				// console.error(`???${propertyName}?????????${expectValue}?????????\n${ex.message}`);
			}
		},
	};
	settingProperties[propertyName] = descriptor;
	if (!depend) {
		depend = space === "Secure" ? "writeSecureSettings" : "writeSettings";
	}
}

// ???????????????
defineSettingProperty({
	key: "development_settings_enabled",
});

// `USB??????`??????ADB??????
defineSettingProperty({
	key: "adb_enabled",
	depend: "development",
});

// ???????????? ??? ?????????????????? ??? ???????????? ??? ??????????????????
defineSettingProperty({
	key: "passport_ad_status",
	type: "String",
	get: value => !/^OFF$/i.test(value),
	set: value => value ? "ON" : "OFF",
});

// ???????????? ??? ???????????? ??? ?????????????????????
defineSettingProperty({
	key: "personalized_ad_enabled",
});

// ?????????????????????
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
	const toString = () => Array.from(services).join(":");
	const proxy = {
		toString,
		inspect: toString,
		toJSON: toString,
	};

	Object.getOwnPropertyNames(Set.prototype).forEach(propertyName => {
		proxy[propertyName] = (...args) => {
			const result = services[propertyName](...args);
			set(toString());
			settings.accessibility = true;
			return result;
		};
	});

	accessibilityServices.get = () => {
		services = new Set(get().trim().split(/\s*:\s*/g));
		return Object.create(proxy);
	};
	delete accessibilityServices.set;
})(settingProperties.accessibilityServices);

[
	// ?????????????????????
	"accessibility_enabled",
	// ???????????? ??? ????????????????????????
	"http_invoke_app",
	// ???????????? ???????????????????????????????????????
	"upload_log_pref",
	// ???????????? ??? ????????????????????????
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

settings.accessibilityServiceEnabled = true;

module.exports = settings;
