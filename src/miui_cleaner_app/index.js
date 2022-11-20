console.setGlobalLogConfig({
	file: files.join(
		context.getExternalFilesDir("logs"),
		"log.txt",
	),
});

const singleChoice = require("./singleChoice");

const mainActions = [
	require("./sysAppRm"),
	require("./downApp"),
	require("./offAppAd"),
	require("./appManager"),
	require("./recycle"),
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
module.exports = regBack;
if (DEBUG && engines.myEngine().source.toString() !== "/storage/emulated/0/脚本/miui_cleaner_app/main.js") {
	console.log("DEBUG");
	engines.execScriptFile("/storage/emulated/0/脚本/miui_cleaner_app/main.js");
} else {
	mainMenu();
	require("./update");
}
