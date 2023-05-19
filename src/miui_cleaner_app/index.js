console.setGlobalLogConfig({
	file: files.join(
		context.getExternalFilesDir("logs"),
		"log.txt",
	),
});
if (DEBUG) {
	delete global.Promise;
	require("core-js/es/promise/");
	require("core-js/es/promise/any");
	require("core-js/es/promise/finally");
}
require("core-js/web/url");
require("core-js/web/url-search-params");
require("core-js/es/array/flat");
require("core-js/es/object/assign");
require("core-js/es/reflect");

global.atob || (global.atob = global.$base64.decode);

if (!global.fetch) {
	Object.assign(global, require("./fetch-polyfill"));
}

require("./dateFormat");

const singleChoice = require("./singleChoice");
const update = require("./update");

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
	update.checkUpdate();
})();
module.exports = regBack;
module.exports.mainMenu = mainMenu;
