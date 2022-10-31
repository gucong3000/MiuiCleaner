const prettyBytes = require("pretty-bytes");
const project = require("./project.json");
const downFile = require("./downFile");
const dialogs = require("./dialogs");

// require("core-js/modules/es.promise");
require("core-js/modules/es.promise.any");

function request (url, options) {
	return new Promise((resolve, reject) => {
		http.request(url, {
			method: "GET",
			...options,
		}, (res) => {
			if (res.statusCode >= 200 && res.statusCode < 300) {
				ui.run(() => {
					resolve(res);
				});
			} else {
				reject(res);
			}
		});
	});
}

function getJson (url) {
	return request(url, {
		contentType: "application/json",
	}).then(res => {
		return res.body.json();
	});
}

function si (number, options) {
	return prettyBytes(number, {
		binary: true,
		...options,
	});
}

function download (remote, options) {
	const downTask = downFile(options);

	let progressDialog;
	let view;

	function showProgressDialog () {
		if (progressDialog) {
			progressDialog.show();
			return;
		}
		view = ui.inflate(`
			<vertical>
				<progressbar id="progressbar" indeterminate="true" style="@style/Base.Widget.AppCompat.ProgressBar.Horizontal"/>
				<linear orientation="horizontal">
					<text id="progresstxt" layout_weight="1" />
					<text id="speed" text=" "/>
				</linear>
			</vertical>
		`);
		progressDialog = dialogs(
			`正在下载新版本：${remote.versionName}`,
			{
				title: "版本更新",
				positive: "后台下载",
				negative: false,
				view,
			},
		);
	}
	downTask.on("start", showProgressDialog);
	downTask.on("click", showProgressDialog);
	downTask.on("progress", ({
		progress,
		speed,
		size,
	}) => {
		view.progressbar.indeterminate = false;
		view.progressbar.max = size;
		view.progressbar.progress = progress;
		view.progresstxt.setText(`${si(progress)}/${si(size)}`);
		view.speed.setText(speed >= 0 ? `${si(speed)}/s` : "");
	});

	return downTask.then(intent => {
		let confirm;
		if (progressDialog) {
			progressDialog.dismiss();
			confirm = dialogs.confirm("下载完毕，立即安装？", {
				title: "版本更新",
			});
		} else {
			confirm = Promise.resolve(true);
		}
		return confirm.then(confirm => {
			if (confirm) {
				return app.startActivity(intent);
			}
		});
	});
}

function getFastUrl (remote) {
	const inGFW = java.util.Locale.getDefault().getCountry() === "CN";
	return Promise.any([
		"github.com",
		inGFW && "download.fastgit.org",
	].filter(Boolean).map(host => (
		`https://${host}/gucong3000/MiuiCleaner/releases/download/v${remote.versionName}/MiuiCleaner.apk`
	)).map(url => {
		return request(url, {
			method: "HEAD",
		}).then((res) => {
			return {
				contentDisposition: res.headers["content-disposition"],
				size: +res.headers["content-length"],
				mimeType: res.headers["content-type"],
				url,
			};
		});
	}));
}

Promise.any([
	"https://cdn.jsdelivr.net/gh/gucong3000/MiuiCleaner/src/miui_cleaner_app/project.json",
	"https://raw.fastgit.org/gucong3000/MiuiCleaner/main/src/miui_cleaner_app/project.json",
	"https://raw.githubusercontent.com/gucong3000/MiuiCleaner/main/src/miui_cleaner_app/project.json",
].map(getJson)).then(remote => {
	if (project.versionCode >= parseInt(remote.versionCode)) {
		return;
	}

	return dialogs.confirm(
		`发现新版本：${remote.versionName}，是否升级？`,
		{
			title: "版本更新",
			neutral: "在浏览器中打开",
		},
	).then(confirm => {
		if (!confirm) {
			if (confirm === null) {
				app.openUrl("https://github.com/gucong3000/MiuiCleaner/releases/latest");
			}
			return;
		}
		return getFastUrl(remote).then(options => download(remote, options));
	});
}).catch(console.error);
