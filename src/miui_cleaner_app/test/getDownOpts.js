module.exports = (getDownOpts) => {
	return DEBUG && Promise.all([
		// getDownOpts("https://www.firepx.com/app/android-mi-browser-google-play/").then(miBrowserFirepx => {
		// 	console.assert(Array.isArray(miBrowserFirepx), "MIUI浏览器应该是数组");
		// 	miBrowserFirepx.forEach(file => {
		// 		console.assert(/^Mi\s+Browser-.*\.apk$/.test(file.fileName), "MIUI浏览器应该是数组");
		// 	});
		// }),
		// getDownOpts("https://firepx.lanzoul.com/b00vs5efe#pwd=385m").then(miBrowserFirepx => {
		// 	throw new Error("密码错误，应该报错");
		// }, error => {
		// 	console.assert(error.info === "密码不正确", error.info || "密码不正确");
		// }),
		// getDownOpts("https://423down.lanzouv.com/tp/i7tit9c#pwd=6svq").then(dianshijia => {
		// 	// 单文件，有密码
		// 	// console.log("testcase", dianshijia);
		// 	console.assert(/^电视家.*\.apk$/.test(dianshijia.fileName), "电视家文件名");
		// 	console.assert(!!dianshijia.url, "没能查到电视家下载地址");
		// }),
		// getDownOpts("https://zisu.lanzoum.com/tp/iI7LGwn5xjc").then(installer => {
		// 	// 单文件，无密码
		// 	// console.log(installer);
		// 	console.assert(/^应用包管理组件.*\.apk$/.test(installer.fileName), "应用包管理组件");
		// 	console.assert(installer.id === "iI7LGwn5xjc", "应用包管理组件，ID：iI7LGwn5xjc");
		// 	console.assert(!!installer.url, "没能查到应用包管理组件下载地址");
		// }),
		// getDownOpts("https://zisu.lanzoum.com/iI7LGwn5xjc").then(installer => {
		// 	// 单文件，无密码，URL不含“tp”
		// 	// console.log(installer);
		// 	console.assert(/^应用包管理组件.*\.apk$/.test(installer.fileName), "应用包管理组件");
		// 	console.assert(installer.id === "iI7LGwn5xjc", "应用包管理组件，ID：iI7LGwn5xjc");
		// 	console.assert(!installer.url, "没能查到应用包管理组件下载地址");
		// }),
		// getDownOpts("https://423down.lanzouv.com/b0f2uzq2b").then(coolapk => {
		// 	// 文件夹，无密码
		// 	console.assert(Array.isArray(coolapk), "酷安应该是数组");
		// 	coolapk.forEach(file => {
		// 		console.assert(/^(酷安|FuckCoolapk).*\.apk$/.test(file.fileName), "酷安应该是数组");
		// 	});
		// }),
		// getDownOpts("https://gucong.lanzoub.com/b03pbkhif#pwd=miui").then(cleaner => {
		// 	// 文件夹，有密码
		// 	console.assert(Array.isArray(cleaner), "MiuiCleaner应该是数组");
		// 	cleaner.forEach(file => {
		// 		console.assert(/^MiuiCleaner.*\.zip$/.test(file.fileName), "MiuiCleaner应该是数组");
		// 	});
		// }),

		// getDownOpts("https://423down.lanzouv.com/iHmmD06tw9xa").then(appShare => {
		// 	// 特殊页面
		// 	console.assert(/^App分享.*\.apk$/.test(appShare.fileName), "App分享");
		// 	console.assert(appShare.id === "iHmmD06tw9xa", "App分享，ID：iI7LGwn5xjc");
		// 	console.assert(appShare.size === "22.3 M", "App分享，size：22.3 M");
		// 	console.assert(appShare.time === "2022-06-23", "App分享，time：2022-06-23");
		// 	console.assert(!appShare.url, "没能查到App分享下载地址");
		// }),

		// singleFile("iI7LGwn5xjc").then(console.log);

	]).catch(console.error);
};
