const findClickableParent = require("./findClickableParent");
const servicesTest = DEBUG && require("./test/services");

const thisPackageName = context.getPackageName();
const securityCenterPackageName = "com.miui.securitycenter";
const settingsPackageName = "com.android.settings";
const marketPackageName = "com.xiaomi.market";

function delay (time) {
	sleep(time || 0x200);
}

function findByClassName (reg) {
	return selector().filter(
		uiObject => reg.test(uiObject.className()),
	);
}

/**
 * 向上查找 UiObject 的父节点，找到可滚动的祖先节点
 * @param {UiObject} node 节点
 * @returns
 */
function findScrollableParent (node) {
	return !node || node.scrollable() ? node : findScrollableParent(node.parent());
}

function isFrameLayout (linear) {
	return /\.FrameLayout$/.test(linear.className());
}

function getDefaultValue (value, defaultValu) {
	return value == null
		? defaultValu
		: value
	;
}

// 打开USB调试、关闭下载管理程序资源推荐等，会弹出的二次确认，自动点击
function skipConfirmPopup () {
	let btn;
	let dialog;
	do {
		const checkBox = selector().id("check_box").packageName("com.miui.securitycenter").findOnce();
		if (checkBox && checkBox.checkable() && checkBox.clickable() && !checkBox.checked()) {
			checkBox.click();
		}
		btn = selector().filter(btn =>
			/\b(ok|accept|intercept_warn_allow)$/.test(btn.id()) ||
			/^(确[认定](关闭)?|删除)$/.test(btn.text()),
		).findOne(0x200);
		if (btn) {
			const time = /\((\d+)\)$/.exec(btn.text());
			if (time) {
				delay(time[1] * 1000);
			} else {
				clickButton(btn);
			}
		}
		dialog = selector().filter(dialog =>
			/\bdialog(_\w+)*$/.test(dialog.id()),
		).findOnce();
		if (dialog) {
			delay();
		}
	} while (btn || dialog);
}

function walkListView (options = {}) {
	const adCheckBoxList = [];
	const adLinearList = [];
	let inNotifyMgr;
	const listView = findByClassName(/\.(RecyclerView|ListView)$/).filter(view => {
		const packageName = view.packageName();
		return options.packageName === packageName || (inNotifyMgr = packageName === settingsPackageName);
	}).findOne();
	delay();
	const regSwitchOn = inNotifyMgr
		? null
		: getDefaultValue(
			options.regSwitchOn,
			/^(仅在(WLAN|Wi-?Fi)下.*?|.*?广告(拦截|过滤)|去.*?广告)$/i,
		);
	const regSwitchOff = inNotifyMgr
		? /^允许通知$/
		: getDefaultValue(
			options.regSwitchOff,
			/猜你喜欢|天气视频|桌面搜索|用户体验|在线(内容)?服务|个性化|消息|广告|热[榜门]|推[荐广]|宫格[栏位]|技巧|热点|新闻|[资快]讯|推送(服务|通知)|通知栏|扫描内存|福利活动|显示天气服务/,
		);
	const regSubPage = inNotifyMgr
		? null
		: getDefaultValue(
			options.regSubPage,
			/^(高级|其他|消息[与和]?推送|.*?广告(拦截|过滤)|去.*?广告|(.*?((消息)?通知|隐私|功能|个性化|信息流|用户体验|[主首]页|闹钟)(设置|管理|服务|计划|[防保]护)))$/,
		);
	if (!options.handle) {
		options.handle = {};
	};
	const result = {};
	if (options.walk) {
		Object.assign(
			result,
			options.walk(listView, options),
		);
	}
	let linearList = listView.children();
	linearList = Array.from(linearList).filter(linear => linear && linear.clickable() && !isFrameLayout(linear));

	linearList.forEach(linear => {
		const textViewList = Array.from(linear.find(findByClassName(/\.TextView$/)));
		if (!textViewList.length) {
			return;
		}
		const textList = textViewList.map(textView => textView.text());

		// 判断按钮是否处置过了
		const key = textList.join();
		if (key in options.handle) {
			return;
		}
		options.handle[key] = null;
		const checkBox = linear.findOne(selector().checkable(true));
		if (checkBox && !checkBox.enabled()) {
			return;
		}
		textList.some((text) => {
			// 如果 linear 是复选框（CheckBox、Switch）
			if (checkBox) {
				let expect;
				if (regSwitchOn && regSwitchOn.test(text)) {
					expect = true;
				} else if (regSwitchOff && regSwitchOff.test(text)) {
					expect = false;
				} else {
					// continue textList的循环体
					return false;
				}
				// 添加至 adCheckBoxList 中暂存
				adCheckBoxList.push({
					linear,
					checkBox,
					expect,
					text: textList[0],
				});
				// break textList的循环体
				return true;
			} else if (regSubPage && regSubPage.test(text)) {
				// 添加至 adLinearList 中暂存
				adLinearList.push({
					linear,
					text: textList[0],
				});
				// break textList的循环体
				return true;
			}
			// continue textList的循环体
			return false;
		});
	});

	// 统一处置广告相关开关
	adCheckBoxList.forEach(adCheckBox => {
		if (!adCheckBox.checkBox.enabled()) {
			return;
		}
		// CheckBox的checked属性与预期不符，
		if (adCheckBox.expect !== adCheckBox.checkBox.checked()) {
			// click一下
			adCheckBox.linear.click();
			skipConfirmPopup();
			console.log(`已${adCheckBox.expect ? "打开" : "关闭"}“${adCheckBox.text}”`);
			result[adCheckBox.text] = adCheckBox.expect;
		} else {
			console.log(`“${adCheckBox.text}”已处于${adCheckBox.expect ? "打开" : "关闭"}状态`);
		}
		options.handle[adCheckBox.text] = adCheckBox.expect;
	});

	adLinearList.forEach(adLinear => {
		// 统一处置广告相关子页面
		if (options.handle[adLinear.text]) {
			return;
		}
		adLinear.linear.click();
		console.log(`已点击“${adLinear.text}”`);
		delay();
		const subResult = walkListView({
			...options,
			handle: {},
		});
		options.handle[adLinear.text] = subResult.handle;
		delete subResult.handle;
		result[adLinear.text] = subResult;
	});

	if (
		// 判断页面是否需要下滚
		listView.scrollable() &&
		!(
			options.disableScroll ||
			inNotifyMgr ||
			(options.max && Object.keys(options.handle).filter(key => options.handle[key]).length >= options.max)
		) &&
		listView.scrollForward()
	) {
		console.log("页面滑动");
		delay();
		Object.assign(result, walkListView(options));
	} else {
		console.log("返回");
		back();
		delay();
	}
	result.handle = options.handle;
	return result;
}

function getDelayTimeByPackageName (packageName) {
	if (!/\bbrowser\b/.test(packageName) && (/^com\.(android|(xiao)?mi(ui)?)\./.test(packageName) || /inputmethod/.test(packageName))) {
		// 系统应用等500毫秒
		return 0x200;
	}
	// 第三方应用等2秒
	// console.log("任务两秒后开始");
	return 0x800;
}

/**
 * 启动应用
 * @param {string} packageName 包名
 * @param {string} className Activity 的类名
 * @returns {bool|null} 是否成功启动
 */
function startPkg ({
	packageName,
	activity,
	name,
}) {
	const result = app.launchPackage(packageName);
	if (result) {
		toastLog(`正在启动“${name}”，“${packageName}”`);
		const delayTime = getDelayTimeByPackageName(packageName);
		if (activity && activity.startsWith(packageName)) {
			waitForActivity(activity);
		} else {
			waitForPackage(packageName);
			delay(delayTime);
		}
		delay(delayTime);
	} else {
		console.error(`未安装“${packageName}”`);
	}
	return result;
}

/**
 * 启动 Activity
 * @param {string} packageName 包名
 * @param {string} className Activity 的类名
 * @returns {bool|null} 是否成功启动
 */
function startAct ({
	packageName,
	activity,
	name,
}) {
	const className = activity.replace(/^(?=\.)/, packageName);
	const opts = {
		packageName,
		className,
	};
	let result;
	try {
		result = app.startActivity(opts);
	} catch (ex) {
		if (/Permission Denial/.test(ex.message)) {
			console.log(ex.message);
			return startPkg({
				packageName,
				activity: className,
			});
		} else {
			console.error(ex.message);
		}
		return false;
	}

	toastLog(`正在启动“${name}”，“${packageName}/${activity}”`);
	waitForActivity(className);
	delay(getDelayTimeByPackageName(packageName));
	return result || true;
}

function startIntent ({
	packageName,
	intent,
	name,
}) {
	intent = android.provider.Settings[intent];
	app.startActivity(
		/\bMANAGE_/.test(intent)
			? {
				action: intent,
				data: "package:" + thisPackageName,
			}
			: new android.content.Intent(intent),
	);

	waitForPackage(packageName);
	toastLog(`正在启动“${name}”，“${intent}”`);
	delay();
}

function clickButton (btnLabelList, text) {
	if (!Array.isArray(btnLabelList)) {
		btnLabelList = [btnLabelList];
	}
	btnLabelList = btnLabelList.filter(btnLabel => {
		const button = findClickableParent(btnLabel);
		if (button) {
			button.click();
			text = text || btnLabel.text();
		}
		return button;
	});
	if (btnLabelList.length) {
		console.log(`已点击“${text}”`);
		delay();
		return btnLabelList;
	} else {
		return null;
	}
}

/**
 * @returns 跳过隐私、用户协议、登录页面、授权页面等
 */
function skipPopupPage () {
	const currAct = currentActivity();
	let btnText;
	if (/^com\.xiaomi\.market\..*?privacy/i.test(currAct)) {
		// 应用商店用户协议页
		btnText = "同意";
	} if (/\bAlertDialog/i.test(currAct)) {
		btnText = "确定";
	} if (/\bConfirmStart/i.test(currAct)) {
		// MIUI 允许启动其他APP
		btnText = "允许";
	} else {
		clickButton(
			// 知乎用户协议页
			// 知乎账号登录页
			selector().filter(
				btn => /^com\.zhihu\.android\b/.test(btn.packageName()) && /^(tv_agree_continue|ivBack)$/.test(btn.id()),
			).findOnce(),
		);
		clickButton(
			// 小米视频、音乐、时钟、小米浏览器国际版等MIUI APP的用户协议页
			selector().filter(
				btn => /^com\.(xiao)?mi(ui)?\./.test(btn.packageName()) && (/\b(v_enable|cta_agree|cta_positive|privacy_continue_btn)$/.test(btn.id()) || /^同意$/.test(btn.text())),
			).findOnce(),
		);
		clickButton(
			// 天气、日历、时钟、小米社区等MIUI APP的用户协议页
			selector().packageName(securityCenterPackageName).id("cta_positive").findOnce(),
		);
	}
	btnText && clickButton(selector().text(btnText).findOne());
}

/**
 * 用 UiSelector 查找之后，选取最右上角的那个
 **/
function findOneByRightTopCorner (uiSelector) {
	return Array.from(
		uiSelector.untilFind(),
	).filter(findClickableParent).sort((uiObjectA, uiObjectB) => {
		const rectA = uiObjectA.bounds();
		const rectB = uiObjectB.bounds();
		return rectA.top - rectB.top || rectB.right - rectA.right;
	})[0];
}

/**
 * 用 UiSelector 查找之后，选取最右下角的那个
 **/
function findOneByRightBottomCorner (uiObjList) {
	return uiObjList.filter(findClickableParent).sort((uiObjectA, uiObjectB) => {
		const rectA = uiObjectA.bounds();
		const rectB = uiObjectB.bounds();
		return rectB.bottom - rectA.bottom || rectB.right - rectA.right;
	})[0];
}

/**
 * 先点击“ ⋮ ” ，再在弹出菜单中点“设置”按钮
 * APP 右上角的“ ⋮ ” 各应用情况
 * 天气：ID：activity_main_more、desc：更多设置
 * 日历：ID：setting_button、desc：设置
 * 下载管理：ID：more、desc：设置
 */
function openCfgPageByPopupMenu (options) {
	return clickButton(
		findOneByRightTopCorner(
			selector().filter(
				btn => /\b(\w+_)*?(menu|more|settings?)(_\w+)*?$/.test(btn.id()) || /^(更多)?设置$/.test(btn.desc()),
			),
		),
		" ⋮ ",
	) &&
	clickButton(selector().text("设置").packageName(options.packageName).untilFind());
}

/**
 * 先点击“ ≡ ”或者“我的”，再点“⚙️”按钮
 * “≡”按钮各应用情况
 * miui浏览器(简洁模式)：ID：无、desc：菜单
**/
function openCfgPageBySubPage (options) {
	const btnMineList = [];
	const btnMenuList = [];
	selector().packageName(options.packageName).filter(btn => {
		if (findScrollableParent(btn) || !findClickableParent(btn)) {
			return false;
		} else if (/^(我的|未登录|个人中心)$/.test(btn.text() || btn.desc()) || /\b(\w+_)*?(my|mine)(_\w+)*?$/.test(btn.id())) {
			btnMineList.push(btn);
		} else if (btn.desc() === "菜单") {
			btnMenuList.push(btn);
		} else {
			return false;
		}
		return true;
	}).untilFind();
	const btnMine = findOneByRightBottomCorner(btnMineList);
	const btnMenu = findOneByRightBottomCorner(btnMenuList);

	let btn;
	let btnText;
	if (btnMenu) {
		btn = btnMenu;
		btnText = " ≡ ";
	} else if (btnMine) {
		btn = btnMine;
	} else {
		return null;
	}

	return clickButton(
		btn,
		btnText || btn.text() || "我的",
	) && openCfgPage(options);
}

/**
 * 应用包安装程序：ID：setting_icon、desc：设置
 * APP “⚙️”按钮各应用情况
 * 应用商店：ID：setting_icon、desc：设置
 * 知乎：ID：setting_btn、desc：无
 * miui浏览器(默认模式)：ID：无、desc：无
 * 应用包安装程序：ID：setting_icon、desc：设置、注：没有“我的”
 */
function openCfgPage (options) {
	return clickButton(
		findOneByRightTopCorner(
			selector().packageName(options.packageName).filter(
				btn => /^(更多)?设置$/.test(btn.text() || btn.desc()) || /\b(\w+_)*?settings?(_\w+)*?$/.test(btn.id()),
			),
		),
		"⚙️",
	);
}

/**
 * 调用MIUI后台清理功能
 */
function clearAnim () {
	try {
		recents();
	} catch (ex) {
		console.error(ex);
		return;
	}
	toastLog("正在清理后台应用");
	delay();
	clickButton(selector().id("clearAnimView").findOne(0x500), "X");
	delay(0x400);
}

function startTask (options) {
	options = { ...options };
	if (options.intent) {
		startIntent(options);
	} else if (options.activity) {
		startAct(options);
	} else {
		startPkg(options);
	}
	const entry = options.entry;
	if (entry) {
		entry(options);
	}
	const result = walkListView(options);

	// if (entry && entry === openCfgPageBySubPage) {
	// 	back();
	// }
	while (currentPackage() !== thisPackageName) {
		back();
		delay();
	}

	if (options.done) {
		options.done(result);
	}
	if (DEBUG && servicesTest) {
		servicesTest(options, result);
	}
	return result;
}

function switchBroHomePage (listView, options) {
	// 小米浏览器及国际版的特别控件————版式切换
	Array.from(listView.children()).some(linear => {
		if (!linear) {
			return false;
		}
		return Array.from(
			linear.find(findByClassName(/\.TextView$/)),
		).map(
			textView => textView.text(),
		).some((text, index) => {
			if (text !== "简洁版") {
				return false;
			}
			const btn = linear.children().filter(btn => btn.clickable())[index];
			if (btn) {
				btn.click();
				options.handle[text] = true;
				console.log(`“${options.appName}”首页已切换为“${text}”`);
				delay();
			} else {
				console.error(linear);
			}
			return true;
		});
	});
}

const browserConfig = {
	packageName: "com.android.browser",
	activity: "com.android.browser.BrowserActivity",
	entry: openCfgPageBySubPage,
	walk: switchBroHomePage,
	// done: console.log,
};

// 在“关于手机”手机界面，点击“MIUI版本” 10次
function click10 (listView, options) {
	listView = selector().packageName(settingsPackageName).scrollable(true).findOne();
	let textView;
	do {
		textView = selector().packageName(settingsPackageName).filter(
			textView => /\bcard_title$/.test(textView.id()) && /^MIUI/.test(textView.text()),
		).findOnce();
	} while (!textView && listView.scrollForward());
	if (textView) {
		const text = textView.text();
		const btnMiui = findClickableParent(textView);
		for (let index = 1; index < 0xF; index++) {
			btnMiui.click();
			console.log(`已点击“${text}”${index}次`);
			options.handle[text] = index;
		}
	}
}
// function openInstallerHelper () {
// 	const packageName = "com.miui.packageinstaller";
// 	const appName = app.getAppName(packageName);

// 	clickButton(
// 		selector().filter(btn => (
// 			appName === btn.text() && /\bandroid\b/.test(btn.packageName())
// 		)).findOnce()
// 	);
// 	clickButton(
// 		selector().packageName(packageName).text("确定").findOnce()
// 	);
// }

// function getSystemConfig (key) {
// 	return getSysConfig("Secure", key);
// }

const cleanerList = [
	{
		name: "系统安全",
		packageName: settingsPackageName,
		intent: "ACTION_SECURITY_SETTINGS",
		regSubPage: /(广告|链接调用)/,
		regSwitchOff: /诊断数据|广告推荐|链接调用|用户体验/,
	},
	{
		name: "关于手机",
		packageName: settingsPackageName,
		intent: "ACTION_DEVICE_INFO_SETTINGS",
		regSubPage: null,
		regSwitchOff: null,
		regSwitchOn: null,
		walk: click10,
	},
	{
		name: "开发者选项",
		packageName: settingsPackageName,
		intent: "ACTION_APPLICATION_DEVELOPMENT_SETTINGS",
		regSubPage: null,
		regSwitchOff: null,
		regSwitchOn: /^USB\b/,
		max: 3,
	},
	{
		// `广告服务` 位于 `安全` 的子页面
		name: "广告服务",
		packageName: settingsPackageName,
		activity: ".ad.AdServiceSettings",
		regSwitchOff: /.*/,
		regSwitchOn: null,
	},
	{
		// 小米帐号
		packageName: "com.xiaomi.account",
		// activity: ".settings.SystemAdActivity",
		activity: ".ui.AccountSettingsActivity",
		regSubPage: /^关于.*?[帐账]号|系统.*?广告$/,
		regSwitchOff: /^系统.*?广告$/,
	},
	{
		// 手机管家 -> 设置页
		packageName: securityCenterPackageName,
		activity: "com.miui.securityscan.ui.settings.SettingsActivity",
	},
	{
		// 手机管家 -> 应用管理
		name: "应用管理",
		packageName: securityCenterPackageName,
		activity: "com.miui.appmanager.AppManagerMainActivity",
		entry: openCfgPageByPopupMenu,
	},
	{
		// 垃圾清理 -> 设置页
		packageName: "com.miui.cleanmaster",
		activity: "com.miui.optimizecenter.settings.SettingsActivity",
	},
	{
		// 应用商店
		packageName: marketPackageName,
		// activity: ".ui.MarketTabActivity",
		entry: openCfgPageBySubPage,
	},
	{
		// 应用商店
		packageName: marketPackageName,
		action: ".ui.CommonWebActivity",
		fn: (configs) => {
			startPkg(configs);
			[
				"我的",
				"系统应用管理",
			].every(text => clickButton(
				selector().packageName(configs.packageName).text(text).findOne(0xFFF),
			));
		},
	},
	// {
	// 	packageName: "com.miui.packageinstaller",
	// 	// activity: "com.android.packageinstaller.SettingsActivity",
	// 	fn: function () {
	// 		const appInfo = downApp("com.google.android.packageinstaller");
	// 		if (appInfo) {
	// 			// const helper = setInterval(openInstallerHelper, 0x50);
	// 			instApk(appInfo.apk);
	// 		}
	// 		// instApk("/system/priv-app/MiuiPackageInstaller/MiuiPackageInstaller.apk");
	// 		// setTimeout(() => {
	// 		// 	clearInterval(helper);
	// 		// }, 0x1000);
	// 	},
	// 	walk: noop,
	// 	entry: openCfgPage,
	// },
	{
		// 下载管理程序
		packageName: "com.android.providers.downloads.ui",
		activity: ".activity.DownloadSettingActivity",
	},
	{
		// 日历
		packageName: "com.android.calendar",
		activity: ".settings.CalendarActionbarSettingsActivity",
	},
	{
		// 时钟
		packageName: "com.android.deskclock",
		activity: ".settings.SettingsActivity",
		regSubPage: /(生活早报|更多.*?设置)/,
		regSwitchOff: /生活早报/,
	},
	{
		// 小米社区
		packageName: "com.xiaomi.vipaccount",
		activity: ".ui.home.page.HomeFrameActivity",
		entry: openCfgPageBySubPage,
	},
	{
		// 小米天气
		packageName: "com.miui.weather2",
		activity: ".ActivityWeatherMain",
		entry: openCfgPageByPopupMenu,
	},
	{
		// 小米视频
		packageName: "com.miui.video",
		activity: ".feature.mine.setting.SettingActivity",
	},
	// {
	// 	// 音乐
	// 	// v3.51.1.1 下载 https://xiaoheiya.lanzoum.com/iVMeWnhkh5c
	// 	packageName: "com.miui.player",
	// 	activity: ".phone.ui.MusicSettings",
	// 	// start: function () {
	// 	// 	app.uninstall("com.miui.player");
	// 	// },
	// 	// "com.tencent.qqmusiclite.activity.MainActivity",
	// },
	{
		// 小爱语音
		packageName: "com.miui.voiceassist",
		activity: "com.xiaomi.voiceassistant.settings.MiuiVoiceSettingActivity",
	},
	{
		// 搜索
		packageName: "com.android.quicksearchbox",
		activity: ".preferences.SearchSettingsPreferenceActivity",
		regSubPage: /^(.*?快捷方式|搜索项|.*?展示模块|热搜榜单)$/,
		regSwitchOn: /广告过滤/,
		regSwitchOff: /桌面搜索框$|搜索精选|热门资讯/,
		walk: (listView, opts) => {
			if (selector().text("热榜管理").id("action_bar_title").findOnce()) {
				let linearList = Array.from(listView.children());
				linearList = linearList.slice(
					0,
					linearList.findIndex(isFrameLayout),
				).reverse();
				linearList.forEach(linear => {
					linear.findOne(selector().clickable()).click();
				});
				if (linearList.length) {
					console.log("已关闭“热榜管理”中的所模块");
					return {
						热搜榜s: false,
					};
				} else {
					console.log("“热榜管理”中的所模块已处于关闭状态");
					opts.handle["热搜榜s"] = false;
				}
			}
		},
	},
	{
		// 小米浏览器国际版
		...browserConfig,
		packageName: "com.mi.globalbrowser",
	},
	{
		// 小米浏览器国内版
		...browserConfig,
	},
	// {
	// 	// 讯飞输入法
	// 	packageName: "com.iflytek.inputmethod",
	// 	// activity: ".LauncherActivity",
	// 	entry: openCfgPageBySubPage,
	// },
	// {
	// 	// 知乎
	// 	packageName: "com.zhihu.android",
	// 	activity: ".app.ui.activity.MainActivity",
	// 	entry: openCfgPageBySubPage,
	// 	disableScroll: true,
	// 	// 打开知乎去广告插件-知了
	// 	regSubPage: /^知了$/,
	// 	regSwitchOn: /^(启用知了|去.*?广告)$/,
	// 	regSwitchOff: false,
	// 	done: function (result) {
	// 		if (!Object.keys(result.handle).length) {
	// 			startTask(this);
	// 		} else if (!result.handle["知了"]) {
	// 			console.hide();
	// 			if (dialogs.confirm("是否下载去广告版知乎？")) {
	// 				downApp(this.packageName);
	// 				startTask(this);
	// 			}
	// 		} else if (result["知了"]["启用知了"]) {
	// 			toastLog("重启知乎后生效");
	// 		}
	// 	}
	// },

].map(menuItem => {
	if (typeof menuItem === "string") {
		menuItem = {
			packageName: menuItem,
		};
	}
	return menuItem;
});

// function offAdByWriteSettings () {
// 	const settings = requestSettings({
// 		writeSettings: true,
// 		accessibility: true,
// 		drawOverlay: true,
// 	});

// 	if (settings.writeSettings) {
// 		try {
// 			// https://developer.android.google.cn/reference/android/provider/Settings
// 			// 系统安全 -> 广告服务 -> 个性化广告推荐：关闭
// 			Settings.Global.putInt(resolver, "personalized_ad_enabled", 0);
// 			[
// 				// 网页链接调用服务
// 				"http_invoke_app",
// 				// 加入“用户体验改进计划”
// 				"upload_log_pref",
// 				// 自动发送诊断数据
// 				"upload_debug_log_pref",
// 			].forEach(key => Settings.Secure.putInt(resolver, key, 0));
// 		} catch (ex) {
// 			//
// 		}
// 	}
// 	if (settings.drawOverlay) {
// 		// 如果有悬浮窗权限，打开控制台
// 		console.clear();
// 		console.show();
// 	}
// }

// function offAppAd () {
// 	// offAdBywriteSettings();
// 	const menuItemList = cleanerList.filter((appInfo) => {
// 		if (appInfo.packageName && !appInfo.appName && !appInfo.name) {
// 			appInfo.appName = app.getAppName(appInfo.packageName);
// 			if (!appInfo.appName) {
// 				return false;
// 			}
// 		}
// 		appInfo.summary = appDesc[appInfo.packageName] || "";
// 		return true;
// 	});

// 	multiChoice({
// 		title: "请选择要关闭广告的APP",
// 		itemList: menuItemList,
// 		checked: true,
// 	}).then(tasks => {
// 		console.show();
// 		const timerSkipPopupPage = setInterval(skipPopupPage, 0x50);
// 		tasks.forEach(task => {
// 			// if (task.test && !task.test(task)) {
// 			// 	return;
// 			// }
// 			console.log(task.name || task.appName);
// 			// ;
// 		});
// 		clearInterval(timerSkipPopupPage);
// 	}).then(taskList => {
// 		offAppAd();
// 	}).catch(console.error);
// };

const actionManageNames = {
	ACTION_MANAGE_UNKNOWN_APP_SOURCES: "安装未知应用",
	ACTION_MANAGE_OVERLAY_PERMISSION: "允许显示在其他应用的上层",
	ACTION_MANAGE_WRITE_SETTINGS: "允许修改系统设置",
};

function getSettings (key) {
	console.log(key);
}

function runTask (taskInfo) {
	if (taskInfo.action === "clearAnim") {
		return clearAnim();
	} else if (/^ACTION_MANAGE_/.test(taskInfo.action)) {
		// 打开各种单项权限管理界面
		return startTask({
			packageName: settingsPackageName,
			intent: taskInfo.action,
			regSwitchOff: taskInfo.checked ? null : /.*/,
			regSwitchOn: taskInfo.checked ? /.*/ : null,
			name: actionManageNames[taskInfo.action] || taskInfo.action,
		});
	}

	let cleaner = cleanerList.filter(cleaner => (
		cleaner.packageName === taskInfo.packageName
	));

	if (cleaner.length > 1) {
		cleaner = cleanerList.filter(cleaner => (
			(cleaner.action || cleaner.activity || cleaner.intent) === taskInfo.action
		));
	}
	cleaner = cleaner[0];
	if (DEBUG && !cleaner) {
		console.error("未找到适配的任务");
		console.error(taskInfo);
	}
	const name = taskInfo.name || taskInfo.appName || cleaner.name;
	if (name) {
		cleaner.name = name;
	}
	if (cleaner.settings && !cleaner.settings.every(getSettings)) {
		console.log(`跳过任务：${name}`);
		return;
	}
	return cleaner.fn ? cleaner.fn(cleaner) : startTask(cleaner);
}

function runTaskList (taskList) {
	auto.waitFor();
	const timerSkipPopupPage = setInterval(skipPopupPage, 0x50);

	if (Array.isArray(taskList)) {
		if (floaty.checkPermission()) {
			console.show();
		}
		taskList = taskList.map(runTask);
	} else {
		taskList = runTask(taskList);
	}
	clearInterval(timerSkipPopupPage);
	console.hide();
	return taskList;
}

function init () {
	const configFilePath = files.join(
		context.getFilesDir(),
		"taskList.json",
	);
	runTaskList(
		JSON.parse(
			files.read(configFilePath),
		),
	);
	files.remove(configFilePath);
}

init();
