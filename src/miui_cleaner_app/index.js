const singleChoice = require("./singleChoice");
const mainActions = [
	{
		name: "预装应用卸载",
		fn: require("./sysAppRm"),
	},
	{
		name: "去广告应用",
		fn: require("./downApp").choice,
	},
	{
		name: "关闭各应用广告",
		fn: require("./offAppAd"),
	},
	{
		name: "应用管家",
		subItems: require("./appManager"),
	},
	{
		name: "回收站",
		fn: require("./recycle"),
	},
	{
		name: "退出",
		fn: exit,
	},
];
function showMenu (title, actions) {
	const action = singleChoice(title, actions);
	if (action) {
		if (action.fn) {
			action.fn();
		} else if (Array.isArray(action.subItems)) {
			showMenu(action.name, action.subItems);
		}
		showMenu(title, actions);
	}
}

// module.exports = mainMenu;
showMenu("MiuiCleaner", mainActions);
