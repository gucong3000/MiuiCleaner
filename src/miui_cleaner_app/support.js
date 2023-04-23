const project = require("./project.json");
const View = android.view.View;
const url = "https://support.qq.com/products/565003";

function support () {
	const postData = new URLSearchParams({
		clientInfo: project.name,
		clientVersion: project.versionName,
		os: `${device.brand}/${device.model}`,
		osVersion: device.fingerprint,
		// netType: "",
		// customInfo: ,
		// openid
		// nickname
		// avatar
	}).toString();
	// console.log(device);

	ui.layout(`
		<vertical>
			<appbar>
				<toolbar id="toolbar" title="${project.name}" subtitle="${module.exports.name}" />
			</appbar>
			<relative w="*" w="*">
				<webview id="webView" layout_below="title" w="*" h="*" />
				<progressbar id="progressbar" indeterminate="true" layout_centerHorizontal="true" layout_alignParentTop="true" w="*" h="auto"style="@style/Base.Widget.AppCompat.ProgressBar.Horizontal" />
			</relative>
		</vertical>
	`);
	const webView = ui.findView("webView");
	const progressbar = ui.findView("progressbar");
	global.activity.setSupportActionBar(ui.findView("toolbar"));

	// https://developer.android.google.cn/reference/android/webkit/WebChromeClient
	webView.setWebChromeClient(
		new JavaAdapter(android.webkit.WebChromeClient, {
			onProgressChanged: (webView, i) => {
				if (i) {
					progressbar.progress = i;
				}
			},
		}),
	);
	// https://developer.android.google.cn/reference/android/webkit/WebViewClient
	webView.setWebViewClient(new JavaAdapter(android.webkit.WebViewClient, {
		onPageStarted: () => {
			progressbar.indeterminate = false;
			progressbar.setVisibility(View.VISIBLE);
		},
		onPageFinished: () => {
			progressbar.setVisibility(View.GONE);
		},
		onCloseWindow: () => {
			console.log("onCloseWindow");
		},
	}));

	const settings = webView.getSettings();
	settings.setJavaScriptEnabled(true);
	settings.setDomStorageEnabled(true);

	webView.loadUrl(`${url}?${postData}`);
	ui.emitter.prependListener("back_pressed", (e) => {
		if (webView.canGoBack()) {
			webView.goBack();
		} else {
			ui.emitter.removeAllListeners("back_pressed");
			require("./index").mainMenu();
		}
		e.consumed = true;
	});
}

module.exports = {
	name: "帮助与反馈",
	summary: "帮助文档、联系作者",
	icon: "./res/drawable/ic_help.png",
	fn: support,
};
