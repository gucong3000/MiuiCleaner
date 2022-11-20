const prettyBytes = require("pretty-bytes");
const project = require("./project.json");
const downFile = require("./downFile");
const dialogs = require("./dialogs");
const request = require("./request");

function iec (number, options) {
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
				<progressbar id="progressbar" indeterminate="true" style="@style/Base.Widget.AppCompat.ProgressBar.Horizontal" />
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
		view.progresstxt.setText(`${iec(progress)}/${iec(size)}`);
		view.speed.setText(speed >= 0 ? `${iec(speed)}/s` : "");
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
	return request(
		[
			"github.com",
			"download.fastgit.org",
			"gh.api.99988866.xyz/https://github.com",
		].map(
			host => `https://${host}/gucong3000/MiuiCleaner/releases/download/v${remote.versionName}/MiuiCleaner.apk`,
		),
		{
			method: "HEAD",
		},
	);
}

request.getJson([
	"https://cdn.jsdelivr.net/gh/gucong3000/MiuiCleaner/src/miui_cleaner_app/project.json",
	"https://raw.fastgit.org/gucong3000/MiuiCleaner/main/src/miui_cleaner_app/project.json",
	"https://raw.githubusercontent.com/gucong3000/MiuiCleaner/main/src/miui_cleaner_app/project.json",
]).then(remote => {
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
