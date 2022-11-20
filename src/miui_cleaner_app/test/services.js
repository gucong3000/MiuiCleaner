function isObject (val) {
	return val != null && typeof val === "object" && Array.isArray(val) === false;
};
function isBoolean (value) {
	return value === true || value === false;
}
const testCase = {
	小米帐号: {
		关于小米帐号: {
			系统广告: {
				系统工具广告: false,
			},
		},
	},
	广告服务: {
		个性化广告推荐: false,
	},
	系统安全: {
		"加入“用户体验改进计划”": false,
		"自动发送诊断数据": false,
		"广告服务": {
			个性化广告推荐: false,
		},
		"网页链接调用服务": {
			网页链接调用服务: false,
		},
	},
	手机管家: {
		在通知栏显示: false,
		在线服务: false,
		隐私设置: {
			仅在WLAN下推荐: true,
			个性化推荐: false,
		},
	},
	应用管理: {
		资源推荐: false,
	},
	垃圾清理: {
		扫描内存: false,
		推荐内容: false,
		仅在WLAN下推荐: true,
	},
	应用商店: {
		通知设置: {
			新手帮助: false,
			应用更新通知: false,
			点赞消息: false,
			评论消息: false,
		},
		通知栏快捷入口: false,
		隐私设置: {
			个性化服务: {
				个性化服务: false,
			},
		},
		功能设置: {
			显示福利活动: false,
		},
	},
	下载管理: {
		信息流设置: {
			仅在WLAN下加载: true,
			资源推荐: false,
			热榜推荐: false,
		},
	},
	日历: {
		功能设置: {
			显示天气服务: false,
		},
		用户体验计划: {
			内容推广: false,
		},
	},
	时钟: {
		更多闹钟设置: {
			显示生活早报: false,
		},
	},
	小米社区: {
		隐私管理: {
			详情页相似推荐: false,
			个性化广告: false,
			信息流推荐: false,
		},
		关闭私信: null,
		关闭私信消息提醒: true,
	},
	小米天气: {
		用户体验计划: {
			天气视频卡片: false,
			内容推广: false,
		},
	},
	小米视频: {
		隐私设置: {
			个性化内容推荐: false,
			个性化广告推荐: false,
		},
		消息与推送: {
			未读消息提醒: false,
			接收小米推送: false,
		},
		其他: {
			// "已安装插件": [
			// 	"风行",
			// 	"爱奇艺",
			// 	"搜狐",
			// ],
			在线服务: false,
		},
	},
	音乐: {
		/*
		个性化内容推荐: false,
		通知设置: {
			个性化内容推荐: false,
			通知设置: {
				通知提醒: false
			},
			仅在WLAN下自动下载: true
		},
		仅在WLAN下自动下载: true,
		*/
		在线内容服务: false,
	},
	小爱语音: {
		隐私管理: {
			隐私设置: {
				加入用户体验改进计划: false,
				小爱技巧推送服务: false,
				个性化推荐: false,
				个性化广告推荐: false,
			},
		},
	},
	搜索: {
		搜索快捷方式: {
			桌面搜索框: false,
		},
		首页展示模块: {
			热搜榜单: {
				热搜榜s: false,
			},
			搜索提示词: false,
		},
		搜索项: {
			搜索精选: false,
		},
		网站广告过滤: true,
	},
	浏览器: {
		主页设置: {
			简洁版: true,
			宫格位推送: false,
		},
		隐私防护: {
			广告过滤: {
				广告过滤: true,
			},
		},
		消息通知管理: {
			接收消息通知: false,
		},
	},
	小米浏览器: {
		首页设置: {
			简洁版: true,
		},
		隐私保护: {
			广告过滤: {
				广告过滤: true,
			},
		},
		高级: {
			浏览器广告: false,
		},
		通知栏快捷入口: false,
		Facebook快捷通知: false,
	},
	关于手机: {
		"MIUI 版本": 14,
	},
	开发者选项: {
		"USB 调试": true,
		"USB安装": true,
		"USB调试（安全设置）": true,
	},
};
function compiler (result, data, options, parent = []) {
	for (const key in data) {
		const curr = parent.concat(key);
		if (isObject(data[key])) {
			if (!result[key]) {
				const error = new Error(`广告自动关闭模块功能异常: “${options.name || app.getAppName(options.packageName)}”中，“${curr.join("”→“")}”未进行应有的处理`);
				throw error;
			}
			compiler(result[key], data[key], options, curr);
		} else if (data[key] !== result[key]) {
			const error = new Error(`广告自动关闭模块功能异常: “${options.name || app.getAppName(options.packageName)}”中，“${curr.join("”→“")}”应该为${JSON.stringify(data[key])}，实际为${JSON.stringify(result[key])}`);
			throw error;
		}
	}
	for (const key in result) {
		const curr = parent.concat(key);
		if (isBoolean(result[key]) && data[key] !== result[key]) {
			const error = new Error(`广告自动关闭模块功能异常: “${options.name || app.getAppName(options.packageName)}”中，“${curr.join("”→“")}”进行了不当的处理${JSON.stringify(result[key])}`);
			throw error;
		}
	}
}

module.exports = (options, result) => {
	const testCaseName = options.name || options.appName || app.getAppName(options.packageName);
	const data = testCase[testCaseName];

	console.log(`“${testCaseName}”结果：\n` + JSON.stringify(result.handle, 0, "\t"));
	try {
		if (!data) {
			const error = new Error(`广告自动关闭模块功能异常: “${testCaseName}”中，未编写测试用例`);
			throw error;
		}
		compiler(result.handle, data, options);
	} catch (ex) {
		console.error(ex);
	}
};

module.exports.testCase = testCase;
