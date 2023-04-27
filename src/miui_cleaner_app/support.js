const project = require("./project.json");
const View = android.view.View;

function support () {
	const openid = device.getAndroidId();
	const postData = {
		clientInfo: project.name,
		clientVersion: project.versionName,
		os: `${device.brand}/${device.model}`,
		osVersion: device.fingerprint,
		// netType: "",
		// customInfo: ,
		// nickname,avatar,openid 必填
		nickname: device.product,
		avatar: `https://txc.gtimg.com/static/v2/img/avatar/${Number.parseInt(openid.slice(-2), 16) + 1}.svg`,
		openid,
	};

	// console.log(device);

	ui.layout(`
		<vertical>
			<appbar>
				<toolbar id="toolbar" title="${project.name}" subtitle="${module.exports.name}" />
			</appbar>
			<relative w="*" w="*">
				<webview id="webView" layout_below="title" w="*" h="*" />
				<progressbar id="progressbar" indeterminate="true" layout_centerHorizontal="true" layout_alignParentTop="true" w="*" h="auto" style="@style/Base.Widget.AppCompat.ProgressBar.Horizontal" />
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
		shouldOverrideUrlLoading: (webView, webResourceRequest) => {
			progressbar.indeterminate = true;
			progressbar.setVisibility(View.VISIBLE);
			let url = webResourceRequest.getUrl().toString();
			if (/^https?:\/\//i.test(url)) {
				url = url.match(/^https?:\/\/\w+\.qq\.com\/.*?\/link-jump\?jump=(.*)$/i);
				if (url) {
					url = decodeURIComponent(url[1]);
					setTimeout(() => {
						webView.loadUrl(url);
					}, 0);
					return true;
				} else {
					return false;
				}
			}
			const Intent = android.content.Intent;
			const Uri = android.net.Uri;

			const intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
			app.startActivity(intent);
			return true;
		},
		onPageStarted: () => {
			progressbar.indeterminate = false;
			progressbar.setVisibility(View.VISIBLE);
		},
		onPageFinished: () => {
			progressbar.setVisibility(View.GONE);
			webView.evaluateJavascript(
				`javascript:(${(() => {
					const powerBy = document.querySelector(".power_by");
					if (powerBy) {
						powerBy.style.display = "none";
					}
				}).toString().trim()})()`,
				new JavaAdapter(
					android.webkit.ValueCallback,
					{
						onReceiveValue: () => {},
					},
				),
			);
		},
	}));

	const settings = webView.getSettings();
	settings.setJavaScriptEnabled(true);
	settings.setDomStorageEnabled(true);

	webView.postUrl(
		"https://support.qq.com/products/565003",
		java.lang.String(
			new URLSearchParams(postData).toString(),
		).getBytes(),
	);

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
