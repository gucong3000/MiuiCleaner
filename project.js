const fs = require("fs/promises");

(async () => {
	const [
		packageConfig,
		appConfig,
		cmd,
	] = await Promise.all([
		readFile("package.json"),
		readFile("src/miui_cleaner_app/project.json"),
		readFile("src/miui_cleaner_cmd/main.cmd"),
	]);
	appConfig.json.versionName = packageConfig.json.version;
	appConfig.json.versionCode = packageConfig.json.version.replace(/^.*?\.(\d+)$/, "$1") - 0;
	appConfig.json.launchConfig.splashText = packageConfig.json.description;
	packageConfig.json.scripts["build:pull"] = packageConfig.json.scripts["build:pull"].replace(/_v.*?\.apk/, `_v${packageConfig.json.version}.apk`);
	cmd.constents = cmd.constents.replace(/^title\s+.*$/im, `title ${appConfig.json.name} - ${packageConfig.json.description} - v${appConfig.json.versionName}`);
	await Promise.all([
		appConfig.update(),
		packageConfig.update(),
		cmd.update(),
	]);
})(
);

async function readFile (path) {
	let constents = await fs.readFile(path);
	constents = constents.toString("utf-8");
	const json = /\.json$/.test(path) && JSON.parse(constents);

	const file = {
		json,
		constents,
		update: () => {
			let newContents;
			if (file.json) {
				newContents = JSON.stringify(file.json, 0, "\t");
			} else {
				newContents = file.constents;
			}
			if (constents.trim() !== newContents.trim()) {
				return fs.writeFile(path, newContents.trim() + "\n");
			}
		},
	};
	return file;
}
