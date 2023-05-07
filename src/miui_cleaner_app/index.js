console.setGlobalLogConfig({
	file: files.join(
		context.getExternalFilesDir("logs"),
		"log.txt",
	),
});
if (DEBUG) {
	delete global.Promise;
	require("core-js/modules/es.promise");
	require("core-js/modules/es.promise.any");
	require("core-js/modules/es.promise.finally");
}
require("core-js/modules/web.url.js");
require("core-js/modules/web.url-search-params");
require("core-js/modules/es.array.flat");
require("core-js/modules/es.object.assign");

global.atob || (global.atob = global.$base64.decode);
if (!global.fetch) {
	global.fetch = require("./fetch-polyfill");
	// require("abortcontroller-polyfill/dist/polyfill-patch-fetch");
}
require("./dateFormat");

const singleChoice = require("./singleChoice");

const mainActions = [
	require("./offAppAd"),
	require("./sysAppRm"),
	require("./downApp"),
	require("./appManager"),
	require("./recycle"),
	require("./support"),
	{
		name: "控制台",
		summary: "查看运行日志",
		fn: () => {
			setTimeout(() => {
				const settings = require("./settings");
				console.log(
					[
						`SDK: ${device.sdkInt}`,
						`Android: ${device.release}`,
						`MIUI: ${device.incremental}`,
						"settings:",
					].concat(
						settings.keys().map(key => `\t${key}: ${JSON.stringify(settings[key])}`),
					).join("\n"),
				);
			}, 0);
			return app.startActivity("console");
		},
		icon: "./res/drawable/ic_log.png",
	},
	{
		name: "退出",
		summary: "再见",
		icon: "./res/drawable/ic_exit.png",
		fn: () => {
			if (DEBUG) {
				ui.finish();
			} else {
				java.lang.System.exit(0);
			}
		},
	},
];

function mainMenu () {
	singleChoice({
		title: "请选择你的操作",
		itemList: mainActions,
	});
}

function regBack () {
	ui.emitter.removeAllListeners("back_pressed");
	ui.emitter.once("back_pressed", (e) => {
		e.consumed = true;
		mainMenu();
	});
}

(() => {
	if (DEBUG) {
		const thisPackageName = context.getPackageName();
		console.log("DEBUG in", thisPackageName);
		if (thisPackageName === "com.github.gucong3000.miui.cleaner") {
			let entry = engines.myEngine().source.toString();
			if (!entry.startsWith("/")) {
				entry = `/storage/emulated/0/脚本/${thisPackageName}/${entry}`;
				if (files.exists(entry)) {
					engines.execScriptFile(entry);
				}
				return;
			}
		}
	}
	mainMenu();
	require("./update");
})();
module.exports = regBack;
module.exports.mainMenu = mainMenu;
