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
	const pkgInfo = packageConfig.json;
	const appInfo = appConfig.json;

	const date = new Date();
	let versionCode;

	if (process.env.GITHUB_RUN_NUMBER) {
		versionCode = process.env.GITHUB_RUN_NUMBER - 0;
	} else {
		versionCode = (await axios.get("https://raw.fastgit.org/gucong3000/MiuiCleaner/main/src/miui_cleaner_app/project.json")).data.versionCode + 1;
	}

	const versionName = [
		date.getUTCFullYear(),
		date.getUTCMonth() + 1,
		date.getUTCDate(),
		versionCode,
	].join(".");
	pkgInfo.version = versionName;
	appInfo.versionCode = versionCode;
	appInfo.versionName = versionName;
	appInfo.launchConfig.splashText = pkgInfo.description;
	cmd.constents = cmd.constents.replace(
		/^title\s+.*$/im,
		`title ${appInfo.name} - ${pkgInfo.description}`,
	);

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
				).replace(
					/^title\s+.*$/im,
					`title ${appInfo.name} - ${pkgInfo.description} -v${pkgInfo.version}`,
				).replace(/\r?\n/g, "\r\n"),
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
			const finalNewline = /\.(cmd|bat)$/i.test(path) ? "\r\n" : "\n";
			newContents = newContents.replace(/\r?\n/g, finalNewline);
			if (constents.trim() !== newContents.trim()) {
				return fs.writeFile(path, newContents.trim() + finalNewline, ...args);
			}
		},
	};
	return file;
}

// ???????????????????????????????????????????????????????????????
function updateDoc (readme) {
	const docResult = [];
	const testCase = require("./src/miui_cleaner_app/test/services").testCase;
	delete testCase["????????????"];
	delete testCase["???????????????"];

	printTestCase(testCase);

	readme.constents = readme.constents.replace(/(#+\s*?????????????????????[\s\S]*?<\/summary>[\s\S]*?)-[\s\S]*(<\/details>)/, (s, prefix, suffix) => {
		return prefix + docResult.join("\n") + "\n\n" + suffix;
	});

	function printTestCase (data, deep = 0) {
		for (const caseName in data) {
			if (data[caseName] === true) {
				docResult.push("\t".repeat(deep) + "- " + caseName + "???`??????`");
			} else if (data[caseName] === false) {
				docResult.push("\t".repeat(deep) + "- " + caseName + "???`??????`");
			} else if (
				typeof data[caseName] !== "object" ||
			data[caseName] === null ||
			(caseName === "????????????" && !deep)
			) {
				continue;
			} else {
				docResult.push("\t".repeat(deep) + "- " + caseName);
				printTestCase(data[caseName], deep + 1);
			}
		}
	}
}
