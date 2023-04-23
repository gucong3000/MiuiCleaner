const prettyBytes = require("pretty-bytes");
const project = require("./project.json");
const downFile = require("./downFile");
const dialogs = require("./dialogs");
const request = require("./fetch");

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

// https://zhuanlan.zhihu.com/p/314071453
// http://raw.githubusercontent.com 替换为 http://raw.staticdn.net 即可加速。

// GitHub + Jsdelivr
// https://github.com.cnpmjs.org
// https://hub.fastgit.org
// 也就是说上面的镜像就是一个克隆版的 GitHub，你可以访问上面的镜像网站，网站的内容跟 GitHub 是完整同步的镜像，然后在这个网站里面进行下载克隆等操作。

// GitHub 文件加速
// 利用 Cloudflare Workers 对 github release 、archive 以及项目文件进行加速，部署无需服务器且自带CDN.

// https://gh.api.99988866.xyz
// https://g.ioiox.com
request([
	"https://cdn.jsdelivr.net/gh/gucong3000/MiuiCleaner/src/miui_cleaner_app/project.json",
	"https://raw.fastgit.org/gucong3000/MiuiCleaner/main/src/miui_cleaner_app/project.json",
	// "http://raw.staticdn.net/gucong3000/MiuiCleaner/main/src/miui_cleaner_app/project.json",
	"https://raw.githubusercontent.com/gucong3000/MiuiCleaner/main/src/miui_cleaner_app/project.json",
]).then(res => res.ok && res.json()).then(remote => {
	if (!remote) {
		return;
	}
	if (project.versionCode >= parseInt(remote.versionCode)) {
		return;
	}
	return dialogs.confirm(
		`发现新版本：${remote.versionName}，是否升级？`,
		{
			title: "版本更新",
			neutral: true,
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
