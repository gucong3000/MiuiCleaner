const fs = require("fs/promises");

(async () => {
	const [
		packageConfig,
		appConfig,
	] = await Promise.all([
		readJSON("package.json"),
		readJSON("src/miui_cleaner_app/project.json"),
	]);
	appConfig.json.versionName = packageConfig.json.version;
	appConfig.json.versionCode = packageConfig.json.version.replace(/^.*?\.(\d+)$/, "$1") - 0;
	appConfig.json.launchConfig.splashText = packageConfig.json.description;
	packageConfig.json.scripts["build:pull"] = packageConfig.json.scripts["build:pull"].replace(/_v.*?\.apk/, `_v${packageConfig.json.version}.apk`);
	console.log();
	await Promise.all([
		appConfig.update(),
		packageConfig.update(),
	]);
})(
);

async function readJSON (path) {
	let constents = await fs.readFile(path);
	constents = constents.toString("utf-8");
	const file = {
		json: JSON.parse(constents),
		update: () => {
			const newContents = JSON.stringify(file.json, 0, "\t");
			if (constents.trim() !== newContents) {
				return fs.writeFile(path, newContents + "\n");
			}
		},
	};
	return file;
}
