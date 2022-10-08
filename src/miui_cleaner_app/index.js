const singleChoice = require("./singleChoice");

const mainActions = [
	{
		name: "预装APP卸载",
		summary: "卸载系统广告组件及随机预装的APP",
		fn: require("./sysAppRm"),
	},
	{
		name: "去广告APP",
		summary: "各APP的去广告版和广告自动跳过工具",
		fn: require("./downApp"),
	},
	{
		name: "关闭各APP广告",
		summary: "自动查询并关闭各APP中的广告",
		fn: require("./offAppAd"),
	},
	{
		name: "APP管家",
		summary: "广告相关权限管理",
		fn: require("./appManager"),
	},
	{
		name: "回收站",
		summary: "恢复已卸载的APP",
		fn: require("./recycle"),
	},
	{
		name: "日志",
		summary: "查看运行日志",
		fn: () => {
			if (DEBUG) {
				const settings = require("./settings");
				console.log(
					"settings: \n" +
					settings.keys().map(key => `\t${key}: ${JSON.stringify(settings[key])}`).join("\n"),
				);
			}
			return app.startActivity("console");
		},
	},
	{
		name: "退出",
		summary: "再见",
		fn: () => ui.finish(),
	},
];

function mainMenu () {
	singleChoice({
		title: "请选择你的操作",
		itemList: mainActions,
	});
}

function regBack () {
	ui.emitter.once("back_pressed", (e) => {
		e.consumed = true;
		mainMenu();
	});
}

module.exports = regBack;

mainMenu();
