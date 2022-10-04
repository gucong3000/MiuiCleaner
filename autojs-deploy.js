const http = require("http");
const path = require("path");
const util = require("util");
const execFile = util.promisify(require("child_process").execFile);
const { readFile } = require("fs/promises");

class AutojsDeployPlugin {
	constructor (options = {}) {
		this.options = {
			command: [
				"adb",
				"push",
				({ compilation }) => compilation.compiler.outputPath,
				({ compilation }) => compilation.options.output.publicPath,
			],
			save: false,
			rerun: true,
			...options,
		};
		this.readConfig();
	}

	async readConfig () {
		if (this.options.config) {
			return this.options.config;
		}
		let config = await readFile(
			this.options.configFile,
			"utf-8",
		);
		config = JSON.parse(config);
		this.options.config = config;
		return config;
	}

	sendCmd (cmd, path) {
		return new Promise((resolve, reject) => {
			http.get(`http://127.0.0.1:9317/exec?cmd=${cmd}&path=${encodeURI(path)}`, (res) => {
				res.setEncoding("utf8");
				res.on("data", resolve).on("error", reject);
			}).on("error", () => reject(new Error(
				`${AutojsDeployPlugin.name}：自动${cmd}失败,auto.js服务未启动，请在VS Code使用 ctrl+shift+p 快捷键，启动auto.js服务`,
			)));
		}).then(data => {
			data && console.log(`${AutojsDeployPlugin.name}：${data}`);
		}).catch(ex => {
			console.error(ex.message || ex);
		});
	}

	save (compilation) {
		if (this.options.save) {
			return this.sendCmd("save", "/" + compilation.compiler.outputPath);
		}
	}

	async rerun (compilation) {
		if (!this.options.rerun) {
			return;
		}
		const assetsInfo = compilation.assetsInfo;
		const jsFileList = Array.from(assetsInfo.keys()).filter((fileName) =>
			"javascriptModule" in assetsInfo.get(fileName),
		);
		let jsFile = jsFileList[0];
		if (jsFileList.length > 1) {
			const main = (await this.readConfig()).main;
			if (main && jsFileList.includes(main)) {
				jsFile = main;
			}
		}
		if (jsFile) {
			return this.sendCmd("rerun", "/" + path.join(compilation.compiler.outputPath, jsFile));
		}
	}

	async command (compilation) {
		const command = this.options.command;
		if (!command) {
			return;
		}
		const exec = command[0];
		const config = await this.readConfig();
		const args = command.slice(1).map((arg) => (
			(typeof arg === "function")
				? arg({
					compilation,
					config,
				})
				: arg
		));
		let result;

		try {
			result = await execFile(
				exec,
				args,
				{
					// stdio: "inherit",
					...this.options,
				},
			);
		} catch (ex) {
			result = ex;
		}
		let { stdout, stderr, message } = result;
		console.log(`$ ${exec} ${args.join(" ")}`);
		stdout = stdout.trim();
		if (stdout) {
			console.log(stdout.replace(/^\[\s*\d+%\].*?\b\d{1,2}%(\r?\n)+/gm, ""));
		}
		stderr = (stderr || message);
		stderr = stderr && stderr.trim();
		if (stderr) {
			console.error(stderr);
		}
	}

	async updateAsset (compilation) {
		const RawSource = compilation.compiler.webpack.sources.RawSource;
		const config = await this.readConfig();
		compilation.emitAsset(
			"project.json",
			new RawSource(JSON.stringify(config)),
		);
		let ui = this.options.ui;
		if (ui) {
			if (!Array.isArray(ui)) {
				ui = [ui];
			}

			ui.forEach(fileName => {
				if (typeof fileName !== "string") {
					fileName = config.main;
				}
				compilation.updateAsset(
					fileName,
					function (source) {
						return new RawSource("\"ui\";" + source.source());
					},
				);
			});
		}
	}

	apply (compiler) {
		compiler.hooks.done.tapPromise(AutojsDeployPlugin.name, (stats) => {
			const compilation = stats.compilation;
			return Promise.all([
				this.rerun(compilation),
				Promise.race([
					this.save(compilation),
					this.command(compilation),
				]),
			]);
		});

		compiler.hooks.thisCompilation.tap(AutojsDeployPlugin.name, (compilation) => {
			compilation.hooks.processAssets.tapPromise(
				{
					name: AutojsDeployPlugin.name,
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
				},
				() => {
					return this.updateAsset(compilation);
				},
			);
		});
	}
}
module.exports = AutojsDeployPlugin;
