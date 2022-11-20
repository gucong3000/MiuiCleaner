const { Adb } = require("@devicefarmer/adbkit");
const { readFile } = require("fs/promises");
const readline = require("readline");
const path = require("path");

class AutojsDeployPlugin {
	constructor (options = {}) {
		this.options = {
			...AutojsDeployPlugin.defaultOptions,
			...options,
		};
		if (options.projectDirectory) {
			options.projectDirectory = path.posix.resolve(options.projectDirectory);
		}
		this.adb = Adb.createClient();
	}

	static defaultOptions = {
		packageName: {},
		rerun: true,
		project: {},
	};

	async getProjectConfig () {
		let projectConfig = await readFile(
			this.options.configFile,
			"utf-8",
		);
		projectConfig = JSON.parse(projectConfig);
		this.options.project = projectConfig;
		return projectConfig;
	}

	async getPackageName (device) {
		let packageName = this.options.packageName[device.serial];
		if (!packageName) {
			let packages = await this.shell(device, "pm list package org.autojs.");
			packages = packages.trim().split(/\r?\n/g);
			if (packages.length) {
				packageName = packages[0].replace(/^package\s*:\s*/, "").trim();
				this.options.packageName[device.serial] = packageName;
			}
		}
		device.packageName = packageName;
		return device;
	}

	async logcat (compiler) {
		const { Chalk } = await import("chalk");
		const chalk = new Chalk();
		const colors = {
			V: chalk.gray,
			I: chalk.blue,
			W: chalk.yellow,
			E: chalk.red,
		};
		// const icon = {
		// 	W: "⚠",
		// 	I: "ℹ",
		// 	E: "❌",
		// };
		const out = {
			D: "log",
			W: "warn",
			I: "info",
			E: "error",
		};
		const stdout = {};
		const regRemoteDir = new RegExp(this.options.projectDirectory + "(/.*)", "g");
		const localDir = compiler.outputPath;

		const logcat = async (device) => {
			if (stdout[device.serial]) {
				return;
			}
			let level;
			let cmd = compiler.options.watch ? "tail -n 1 -f" : "cat";
			cmd += ` /storage/emulated/0/Android/data/${device.packageName}/files/logs/log.txt`;

			const rl = readline.createInterface({
				input: await device.shell(cmd),
			});
			stdout[device.serial] = rl;
			rl.on("line", (line) => {
				const msg = line.match(/^[\d:.]+\/([A-Z]):\s(.*)$/);
				if (msg) {
					level = msg[1];
					line = msg[2];
					// if (icon[level]) {
					// 	line = `${icon[level]} ${line}`;
					// }
				} else if (!level) {
					return;
				}
				line = line.replaceAll(
					regRemoteDir,
					(s, fileName) => path.join(localDir, fileName),
				);
				console[out[level] || "log"](colors[level] ? colors[level](line) : line);
			});
			rl.on("close", () => {
				stdout[device.serial] = null;
			});
		};
		await this.eachDevice(logcat);
		if (!compiler.options.watch) {
			return;
		}
		const tracker = await this.adb.trackDevices();
		tracker.on("add", async (device) => {
			device = this.adb.getDevice(device.id);
			await device.waitForDevice();
			await this.getPackageName(device);
			if (device.packageName) {
				return logcat(device);
			}
		});
	}

	shell (device, ...args) {
		return device.shell(...args)
			// Use the readAll() utility to read all the content without
			// having to deal with the readable stream. `output` will be a Buffer
			// containing all the output.
			.then(Adb.util.readAll)
			.then((output) => {
				return output.toString();
			});
	}

	async eachDevice (...args) {
		let devices = await this.adb.listDevices();
		devices = devices.map(device => this.adb.getDevice(device.id));
		devices = (await Promise.all(
			devices.map(
				async (device) => {
					await this.getPackageName(device);
					if (device.packageName) {
						return device;
					}
				},
			),
		)).filter(Boolean);
		await Promise.all(devices.map(...args));
	}

	deploy (compilation) {
		const remoteDir = this.options.projectDirectory;
		if (!remoteDir) {
			return;
		}
		const projectConfig = this.options.project;
		const assetsInfo = compilation.assetsInfo;
		const jsFileList = Array.from(assetsInfo.keys()).filter((fileName) =>
			"javascriptModule" in assetsInfo.get(fileName),
		);
		let jsFile = jsFileList[0];
		if (jsFileList.length > 1) {
			const main = projectConfig?.main;
			if (main && jsFileList.includes(main)) {
				jsFile = main;
			}
		}
		const localDir = compilation.compiler.outputPath;
		return this.eachDevice(async (device) => {
			await Promise.all(
				Array.from(compilation.assetsInfo.keys()).map(fileName => (
					device.push(
						path.join(localDir, fileName),
						path.posix.join(remoteDir, fileName),
					)
				)),
			);
			if (this.options.rerun && jsFile) {
				await device.startActivity({
					debug: true,
					action: "android.intent.action.MAIN",
					component: device.packageName + "/org.autojs.autojs.external.shortcut.ShortcutActivity",
					extras: {
						path: path.posix.join(remoteDir, jsFile),
					},
				});
			}
		});
	}

	async updateAsset (compilation) {
		const RawSource = compilation.compiler.webpack.sources.RawSource;
		const projectConfig = await this.getProjectConfig();
		compilation.emitAsset(
			"project.json",
			new RawSource(JSON.stringify(projectConfig)),
		);
		let ui = this.options.ui;
		if (ui) {
			if (!Array.isArray(ui)) {
				ui = [ui];
			}
			ui.forEach(fileName => {
				if (typeof fileName !== "string") {
					fileName = projectConfig.main;
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
		compiler.hooks.done.tapPromise(AutojsDeployPlugin.name, async (stats) => {
			const compilation = stats.compilation;
			await this.deploy(compilation);
		});
		this.logcat(compiler);
	}
}
module.exports = AutojsDeployPlugin;
