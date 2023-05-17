const prettyBytes = require("pretty-bytes");
const project = require("./project.json");
const github = require("./direct-url/github");
const dialogs = require("./dialogs");
const downFile = require("./downFile");

function iec (number, options) {
	return prettyBytes(number, {
		binary: true,
		...options,
	});
}

function loadRemote () {
	return github("https://raw.githubusercontent.com/gucong3000/MiuiCleaner/main/src/miui_cleaner_app/project.json", {
		method: "get",
		redirect: "follow",
	}).catch(ex => {
		console.error(ex);
	});
}

async function userConfirm (remote) {
	const confirm = await dialogs.confirm(
		`发现新版本：${remote.versionName}，是否升级？`,
		{
			title: "版本更新",
			neutral: true,
		},
	);
	if (confirm === null) {
		app.openUrl("https://github.com/gucong3000/MiuiCleaner/releases/latest");
	}
	return confirm;
}

async function loadFileInfo (remote) {
	let assets;
	try {
		assets = await github("https://github.com/gucong3000/MiuiCleaner/releases/latest");
	} catch (ex) {
		// 若API请求大袋
		const fileInfo = github("https://github.com/gucong3000/MiuiCleaner/releases/latest/download/MiuiCleaner.apk");
		fileInfo.versionName = remote.versionName;
		return fileInfo;
	}
	return assets.find(file => file.fileName === "MiuiCleaner.apk" && file.versionName === remote.versionName);
}

async function downloadFile (fileInfo, remote) {
	await fileInfo.getLocation();
	const downTask = downFile(fileInfo);

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
			`正在下载新版本：${fileInfo.versionName || remote.versionName}`,
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

async function checkUpdate () {
	const remote = await loadRemote();
	if (remote && (project.versionCode <= remote.versionCode)) {
		const fileInfo = await loadFileInfo(remote);
		return downloadFile(fileInfo, remote);
	}
}

module.exports = {
	loadRemote,
	loadFileInfo,
	userConfirm,
	downloadFile,
	checkUpdate,
};
