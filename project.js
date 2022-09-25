const fs = require("fs/promises");
const { spawnSync } = require("node:child_process");
const axios = require("axios").default;

(async () => {
	const [
		packageConfig,
		appConfig,
		cmd,
		readme,
	] = await Promise.all([
		readFile("package.json"),
		readFile("src/miui_cleaner_app/project.json"),
		readFile("src/miui_cleaner_cmd/main.cmd"),
		readFile("README.md"),
	]);
	const date = new Date();
	let versionCode;

	if (process.env.GITHUB_RUN_NUMBER) {
		versionCode = process.env.GITHUB_RUN_NUMBER - 0;
	} else {
		// appConfig.json.versionCode = ;
		versionCode = (await axios.get("https://raw.fastgit.org/gucong3000/MiuiCleaner/main/src/miui_cleaner_app/project.json")).data.versionCode + 1;
	}

	appConfig.json.versionCode = versionCode;

	const versionName = [
		date.getUTCFullYear(),
		date.getUTCMonth() + 1,
		date.getUTCDate(),
		versionCode,
	].join(".");

	appConfig.json.versionName = versionName;
	packageConfig.json.version = versionName;
	appConfig.json.launchConfig.splashText = packageConfig.json.description;
	packageConfig.json.scripts["build:pull"] = packageConfig.json.scripts["build:pull"].replace(/_v.*?\.apk/, `_v${versionName}.apk`);
	cmd.constents = cmd.constents.replace(/^title\s+.*$/im, `title ${appConfig.json.name} - ${packageConfig.json.description} - v${appConfig.json.versionName}`);

	const distCmd = fs.writeFile(
		"dist/miui_cleaner_cmd/MiuiCleaner.cmd",
		spawnSync(
			"iconv",
			[
				"--from-code=utf-8",
				"--to-code=gb18030",
			],
			{
				input: cmd.constents.replace(
					/^chcp\s+\d+/im, "chcp 936",
				),
			},
		).stdout,
	);
	updateDoc(readme);

	await Promise.all([
		appConfig.update(),
		packageConfig.update(),
		cmd.update(),
		readme.update(),
		distCmd,
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
		update: (...args) => {
			let newContents;
			if (file.json) {
				newContents = JSON.stringify(file.json, 0, "\t");
			} else {
				newContents = file.constents;
			}
			if (constents.trim() !== newContents.trim()) {
				return fs.writeFile(path, newContents.trim() + "\n", ...args);
			}
		},
	};
	return file;
}

// 保持文档的描述和关闭广告的单元测试数据一致
function updateDoc (readme) {
	const docResult = [];
	printTestCase(require("./src/miui_cleaner_app/test/offAppAdTest").testCase);

	readme.constents = readme.constents.replace(/(#+\s*关闭各应用广告[\s\S]*?<\/summary>[\s\S]*?)-[\s\S]*(<\/details>)/, (s, prefix, suffix) => {
		return prefix + docResult.join("\n") + "\n\n" + suffix;
	});

	function printTestCase (data, deep = 0) {
		for (const caseName in data) {
			if (data[caseName] === true) {
				docResult.push("\t".repeat(deep) + "- " + caseName + "：`打开`");
			} else if (data[caseName] === false) {
				docResult.push("\t".repeat(deep) + "- " + caseName + "：`关闭`");
			} else if (
				typeof data[caseName] !== "object" ||
			data[caseName] === null ||
			(caseName === "广告服务" && !deep)
			) {
				continue;
			} else {
				docResult.push("\t".repeat(deep) + "- " + caseName);
				printTestCase(data[caseName], deep + 1);
			}
		}
	}
}
