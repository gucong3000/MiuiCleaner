module.exports = (getRemoteFileInfo) => {
	return DEBUG && Promise.all([
		// getRemoteFileInfo("https://www.firepx.com/app/android-mi-browser-google-play/").then(miBrowserFirepx => {
		// 	console.assert(Array.isArray(miBrowserFirepx), "MIUI浏览器应该是数组");
		// 	miBrowserFirepx.forEach(file => {
		// 		console.assert(/^Mi\s+Browser-.*\.apk$/.test(file.fileName), "MIUI浏览器应该是数组");
		// 	});
		// }),
		// getRemoteFileInfo("https://firepx.lanzoul.com/b00vs5efe?pwd=385m").then(miBrowserFirepx => {
		// 	throw new Error("密码错误，应该报错");
		// }, error => {
		// 	console.assert(error.message === "密码不正确", error.info || "密码不正确");
		// }),
		// getRemoteFileInfo("https://423down.lanzouv.com/tp/i7tit9c?pwd=6svq").then(dianshijia => {
		// 	// 单文件，有密码
		// 	console.log("testcase", dianshijia);
		// 	console.assert(/^电视家.*\.apk$/.test(dianshijia.fileName), "电视家文件名");
		// 	// console.assert(!!dianshijia.url, "没能查到电视家下载地址");
		// }),
		// getRemoteFileInfo("https://zisu.lanzoum.com/tp/iI7LGwn5xjc").then(installer => {
		// 	// 单文件，无密码
		// 	console.log(installer);
		// 	console.assert(/^应用包管理组件.*\.apk$/.test(installer.fileName), "应用包管理组件");
		// 	console.assert(installer.id === "iI7LGwn5xjc", "应用包管理组件，ID：iI7LGwn5xjc");
		// 	// console.assert(!!installer.url, "没能查到应用包管理组件下载地址");
		// }),
		// getRemoteFileInfo("https://wwm.lanzoul.com/tp/idzsf0bh062h").then(browser => {
		// 	// 单文件，无密码
		// 	console.log(browser);
		// 	console.assert(/^小米浏览器.*\.apk$/.test(browser.fileName), "小米浏览器");
		// 	console.assert(browser.id === "idzsf0bh062h", "小米浏览器，ID：idzsf0bh062h");
		// 	// console.assert(!!browser.url, "没能查到小米浏览器下载地址");
		// }),
		// getRemoteFileInfo("https://423down.lanzouv.com/b0f2uzq2b").then(coolapk => {
		// 	// 文件夹，无密码
		// 	console.log(coolapk);
		// 	console.assert(Array.isArray(coolapk), "酷安应该是数组");
		// 	coolapk.forEach(file => {
		// 		console.assert(/^(酷安|FuckCoolapk).*\.apk$/.test(file.fileName), "酷安应该是数组");
		// 	});
		// }),
		// getRemoteFileInfo("https://gucong.lanzoub.com/b03pbkhif?pwd=miui").then(cleaner => {
		// 	console.log(cleaner);
		// 	// 文件夹，有密码
		// 	console.assert(Array.isArray(cleaner), "MiuiCleaner应该是数组");
		// 	cleaner.forEach(file => {
		// 		console.assert(/^MiuiCleaner.*\.zip$/.test(file.fileName), "MiuiCleaner应该是数组");
		// 	});
		// }),
		// getRemoteFileInfo("https://423down.lanzouv.com/iHmmD06tw9xa").then(appShare => {
		// 	// 特殊页面 - APP 信息
		// 	console.log(appShare);
		// 	console.assert(/^App分享.*\.apk$/.test(appShare.fileName), "App分享");
		// 	console.assert(appShare.id === "iHmmD06tw9xa", "App分享，ID：iI7LGwn5xjc");
		// 	console.assert(appShare.size === 23383245, "App分享，size：22.3 M");
		// 	console.assert(appShare.time === 1655942400000, "App分享，time：2022-06-23");
		// 	console.assert(!appShare.url, "没能查到App分享下载地址");
		// }),
		// getRemoteFileInfo("https://wwe.lanzouw.com/b01v0g3wj?pwd=1233").then(litiaotiao => {
		// 	// 特殊页面 带参数ID
		// 	console.assert(Array.isArray(litiaotiao), "李跳跳应该是数组");
		// 	return Promise.all(
		// 		litiaotiao.map(opts => {
		// 			console.assert(/\?/.test(opts.id), "李跳跳ID中有参数");
		// 			console.assert(/^李跳跳.*\.apk$/.test(opts.fileName), "李跳跳应该是数组");
		// 			return getRemoteFileInfo(opts.referer).then(file => {
		// 				console.assert(!opts.url, "没能查到李跳跳下载地址");
		// 				console.assert(!!file.url, "没能查到李跳跳下载地址");
		// 				console.log(file.fileName, file.versionName);
		// 				Object.keys(opts).forEach(key => {
		// 					console.assert(opts[key] === file[key], "李跳跳 : " + key);
		// 				});
		// 			});
		// 		}),
		// 	);
		// }),
		// getRemoteFileInfo("https://github.com/WangDaYeeeeee/GeometricWeather/releases/latest").then(weather => {
		// 	console.assert(Array.isArray(weather), "几何天气应该是数组");
		// 	weather.forEach(file => {
		// 		console.log(file);
		// 		console.assert(/^GeometricWeather.*\.apk$/.test(file.fileName) || /\.aab$/.test(file.fileName), "几何天气文件名GeometricWeather.*\.apk");
		// 	});
		// }),
		// getRemoteFileInfo("https://423down.lanzouv.com/b0f1d7s2h").then(esexplorer => {
		// 	console.assert(Array.isArray(esexplorer), "ES文件浏览器应该是数组");
		// 	esexplorer.forEach(file => {
		// 		// console.log(file);
		// 		console.assert(/^\wS文件(浏览|管理)器.*\.apk$/.test(file.fileName), "ES文件浏览器文件名");
		// 	});
		// }),
		// getRemoteFileInfo("https://423down.lanzouo.com/b0f2lkafe").then(zhihu => {
		// 	console.log(zhihu);
		// 	console.assert(Array.isArray(zhihu), "知乎应该是数组");
		// 	zhihu.forEach(file => {
		// 		console.log(file.fileName, file.versionName);
		// 		console.assert(/^(知乎|Zhiliao).*\.apk$/.test(file.fileName), "知乎文件名");
		// 	});
		// }),
		// getRemoteFileInfo("https://423down.lanzouv.com/b0f1b6q8d").then(tieba => {
		// 	console.log(tieba);
		// 	console.assert(Array.isArray(tieba), "知乎应该是数组");
		// 	tieba.forEach(file => {
		// 		console.log(file.fileName, file.versionName);
		// 		console.assert(/^(百度)?贴吧.*\.apk$/.test(file.fileName), "贴吧文件名");
		// 	});
		// }),
		// getRemoteFileInfo("https://423down.lanzouv.com/b0f1avpib").then(youku => {
		// 	console.log(youku);
		// }),
		// console.log(getRemoteFileInfo.toString()),

		// getRemoteFileInfo("https://m.32r.com/app/109976.html").then(wps => {
		// 	console.log(wps);
		// }).catch(console.error),

		// getRemoteFileInfo("https://423down.lanzouv.com/b0f1gksne").then(wps => {
		// 	console.log(wps);
		// }),

		// singleFile("iI7LGwn5xjc").then(console.log);

	]).catch(console.error);
};
