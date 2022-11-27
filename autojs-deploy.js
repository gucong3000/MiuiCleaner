const { Adb } = require("@devicefarmer/adbkit");
const { readFile } = require("fs/promises");
const styles = require("ansi-styles");
const path = require("path");
const {
	SourceMapConsumer,
} = require("source-map");

class AutojsDeployPlugin {
	constructor (options = {}) {
		this.options = {
			...AutojsDeployPlugin.defaultOptions,
			...options,
		};
		if (options.remoteDir) {
			options.remoteDir = path.posix.resolve(options.remoteDir);
		}
		this.adb = Adb.createClient();
	}

	// 缺省配置
	static defaultOptions = {
		packageName: {},
		project: {},
		build: {
			ui: true,
		},
		deploy: {
			run: true,
			skipSourceMap: true,
		},
		logcat: {
			stream: process.stdout,
			timestamp: false,
			sourceMap: true,
			color: true,
		},
	};

	// 读取AutoJS项目的`project.json`文件
	async getProjectConfig () {
		let projectConfig = await readFile(
			this.options.configFile,
			"utf-8",
		);
		projectConfig = JSON.parse(projectConfig);
		this.options.project = projectConfig;
		if (!projectConfig.projectDirectory) {
			projectConfig.projectDirectory = projectConfig.packageName || projectConfig.name || require(path.join(process.cwd(), "package.json")).name;
		}
		projectConfig.projectDirectory = path.posix.resolve("/storage/emulated/0/脚本/", projectConfig.projectDirectory);
		return projectConfig;
	}

	// 获取手机中安装的AutoJS Pro 或者AutoX的包名
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

	// 将手机中的日志中锁包含的文件路径映射为PC开发目录的文件路径时的辅助函数
	toLocalPath (options) {
		const consumer = options.file && this.options.logcat.sourceMap[options.file];
		if (consumer) {
			const originalPos = consumer.originalPositionFor(options);
			if (originalPos.source) {
				options.file = new URL(originalPos.source).pathname.replace(/^\/+/, "");
				((name) => {
					if (!name) {
						return;
					}
					if (
						(options.name) && (
							/\b\w*E(rror|xception):/.test(options.name) || options.name.includes(name)
						)
					) {
						return;
					}
					options.name = name;
				})(originalPos.name);
				options.line = originalPos.line;
				options.column = originalPos.column;
			} else {
				options.file = path.posix.join(options.localDir, options.file);
			}
			return options;
		}
	}

	// 日志显示功能，AutoJS Pro可直接使用，AutoX需要在项目代码中配置日志文件路径：`console.setGlobalLogConfig({file: files.join(context.getExternalFilesDir("logs"),"log.txt")});`
	async logcat (compilation) {
		if (!this.options.logcat) {
			return;
		}
		const regMsgInfo = /^([\d:.]+)\/([A-Z]):\s/gm;
		// "https://cdn.jsdelivr.net/gh/kkevsekk1/AutoX/autojs/src/main/assets",
		// "https://github.dev/kkevsekk1/AutoX/tree/dev-test/autojs/src/main/assets"
		const githubAutojsAssets = "https://github.dev/kkevsekk1/AutoX/tree/dev-test/autojs/src/main/assets";
		const colors = {
			V: styles.gray,
			I: styles.green,
			W: styles.yellow,
			E: styles.red,
		};
		let currColor = null;
		const project = await this.getProjectConfig();
		const remoteDir = project.projectDirectory;
		let localDir = compilation.compiler.outputPath;
		const formatTrace = (options) => {
			if (options.pos) {
				const arrPos = options.pos.match(/\d+/g);
				options.line = arrPos[0];
				options.column = arrPos[1];
			}
			options.line = +options.line || 0;
			options.column = +options.column || 0;
			let file = options.file;
			if (file.startsWith(remoteDir)) {
				options = this.toLocalPath({
					...options,
					file: file.slice(remoteDir.length + 1),
					localDir,
				}) || options;
				file = options.file;
			}
			let {
				prefix,
				name,
				line,
				column,
			} = options;
			prefix = prefix || "";
			if (file.startsWith("file:///android_asset/modules/")) {
				file = githubAutojsAssets + file.slice(21);
				file = file + "#L" + line;
			} else {
				file = [file, line || 1, column || 0].filter(Boolean).join(":");
			}
			if (name) {
				return `${prefix}${name} (${file})`;
			} else {
				return `${prefix}${file}`;
			}
		};
		if (path.isAbsolute(localDir)) {
			localDir = path.relative(compilation.options.context, localDir);
		}
		if (path.sep === "\\") {
			localDir = localDir.split(path.win32.sep).join(path.posix.sep);
		}
		const logcat = async (device, packageName) => {
			if (!packageName) {
				return;
			}
			let cmd = compilation.compiler.options.watch ? "tail -f" : "cat";
			cmd += ` /storage/emulated/0/Android/data/${packageName}/files/logs/log.txt`;
			const log = await device.shell(cmd);
			const data = (string) => {
				string = string.toString();
				if (this.options.logcat.sourceMap) {
					string = string.replaceAll(
						/\bfile:\/\/\/android_asset(\/.*?)#(\d+)/g,
						// "https://cdn.jsdelivr.net/gh/kkevsekk1/AutoX/autojs/src/main/assets/modules/__json2__.js#L493",
						// "https://github.dev/kkevsekk1/AutoX/tree/dev-test/autojs/src/main/assets" + file + "#L" + line,
						(s, file, line) => githubAutojsAssets + file + "#L" + line,
					).replaceAll(
						// 替换以下两种错误日志格式中的文件路径和行号(文件路径和行号带括号)：
						// XxxError: error_messarg (/some/path/to/file:69:54)
						//     at function_name (/some/path/to/file:69:54)
						/^((?:[\d:.]+\/[A-Z]:|\s*at)\s+)?(.*?)\s+\((.*?)((?:[:#]\d+)+)\)$/gm,
						(s, prefix, name, file, pos) => formatTrace({
							prefix,
							name,
							file,
							pos,
						}),
					).replaceAll(
						// 替换以下两种错误日志格式中的文件路径和行号(文件路径和行号不带括号，函数名如果存在、带括号)：
						//     at /some/path/to/file:69:54 (function_name)
						//     at /some/path/to/file:69:54
						/^(\s*at\s+)(.*?)((?:[:#]\d+)+)(?:\s+\((.*)\))?$/gm,
						(s, prefix, file, pos, name) => formatTrace({
							prefix,
							file,
							pos,
							name,
						}),
					).replaceAll(
						// 替换类似JSON格式的报错
						// { [JavaException: message ]
						//   fileName: 'file:///android_asset/modules/filename.js',
						//   lineNumber: 8848 }`;
						/\{\s+\[(.+)\]([\s\S]*?)\}/gm,
						(s, message, jsonBody) => {
							let errInfo;
							try {
							/* eslint no-new-func: "off" */
								errInfo = new Function(`return ({${jsonBody}})`)();
							} catch (ex) {
								// return s;
							}
							if (!errInfo || !errInfo.fileName || !/E(rror|xception)/.test(message)) {
								return s;
							}

							return `${message}${formatTrace({
								prefix: "\n    at ",
								file: errInfo.fileName,
								line: errInfo.lineNumber,
								column: errInfo.columnNumber,
							})}`;
						},
					);
				}
				const stream = this.options.logcat.stream || process.stdout;
				if (this.options.logcat.color && stream.hasColors()) {
					string = string.replaceAll(regMsgInfo, (s, timestamp, level) => {
						s = "";
						const newColor = colors[level] || null;
						if (newColor !== currColor) {
							if (currColor) {
								s += currColor.close;
							}
							if (newColor) {
								s += newColor.open;
							}
							currColor = newColor;
						}
						if (this.options.logcat.timestamp) {
							s += `${timestamp}/${level}: `;
							// } else if (!line.trim()) {
							// 	line = "";
						}
						return s;
					});
					if (currColor) {
						string += currColor.close;
						currColor = null;
					}
				}
				stream.write(string);
			};
			const start = () => {
				console.log("> adb shell", cmd);
				log.on("data", data);
			};
			if (compilation.compiler.options.watch) {
				log.once("data", start);
				log.once("close", () => {
					Promise.resolve().then(() => logcat(device, packageName)).catch(() => {
						task[device.serial] = false;
					});
				});
			} else {
				start();
			}
		};
		const task = {};
		const start = (device) => {
			if (task[device.serial]) {
				return;
			}
			task[device.serial] = true;
			return Promise.all(
				[
					project.packageName,
					device.packageName,
				].map(packageName => logcat(device, packageName)),
			);
		};

		await this.eachDevice(start);
		if (compilation.compiler.options.watch) {
			const tracker = await this.adb.trackDevices();
			tracker.on("add", async (device) => {
				device = this.adb.getDevice(device.id);
				await device.waitForDevice();
				await this.getPackageName(device);
				start(device);
			});
			tracker.on("remove", async (device) => {
				task[device.id] = false;
			});
		}
	}

	// 通过ADB在手机的shell中运行命令
	shell (device, ...args) {
		return device.shell(...args)
			.then(Adb.util.readAll)
			.then((output) => {
				return output.toString();
			});
	}

	// 遍历所有通过ADB连接到PC的手机
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

	// 通过ADB将webpack输出的文件部署文件到手机上,会跳过sourceMap文件，手机目录在`options.remoteDir`中配置，未声明会自动选择`/storage/emulated/0/脚本/{project.json中的packageName、name或者package.json中的name}`
	deploy (compilation) {
		if (!this.options.deploy) {
			return;
		}
		const remoteDir = this.options.project.projectDirectory;
		let assets = compilation.getAssets();
		if (this.options.deploy.skipSourceMap) {
			assets = assets.filter(asset =>
				!("development" in asset.info),
			);
		}
		const localDir = compilation.compiler.outputPath;
		return this.eachDevice(async (device) => {
			console.log(`> adb push ${localDir} ${remoteDir}`);
			await Promise.all(
				assets.map(asset => (
					device.push(
						path.join(localDir, asset.name),
						path.posix.join(remoteDir, asset.name),
					)
				)),
			);
			// console.log(assets);
			// console.log(`> adb push "res" ${remoteDir}`);
			// device.push(
			// 	"res",
			// 	remoteDir,
			// );
			// const fs = require("fs/promises");
			// const stats = await fs.stat("res");
			// console.log(stats);
			// const dir = await fs.opendir("res");
			// for await (const dirent of dir) {
			// 	console.log(dirent.name);
			// 	console.log(dirent.isDirectory());
			// 	console.log(dirent.isFile());
			// }
			if (this.options.deploy.run) {
				const jsFileList = assets.filter(asset =>
					"javascriptModule" in asset.info,
				).map(asset => asset.name);
				let jsFile = jsFileList[0];
				if (jsFileList.length > 1) {
					const { main } = await this.getProjectConfig();
					if (main && jsFileList.includes(main)) {
						jsFile = main;
					}
				}
				if (!jsFile) {
					return;
				}

				console.log(`> adb shell am start -a android.intent.action.MAIN -n ${device.packageName}/org.autojs.autojs.external.shortcut.ShortcutActivity -e path ${path.posix.join(remoteDir, jsFile)}`);
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

	// 在webpack变异文件的队列中加入“project.json”、js文件中添加`"ui";指令头`、收集webpack生成的sourceMap文件，供logcat相关功能调用
	async updateAsset (compilation) {
		if (this.options.logcat.sourceMap) {
			this.options.logcat.sourceMap = {};
			compilation.getAssets().forEach(asset => {
				if ("development" in asset.info) {
					const consumer = new SourceMapConsumer(asset.source.source());
					this.options.logcat.sourceMap[consumer.file] = consumer;
				}
			});
		}
		if (!this.options.build) {
			return;
		}
		const RawSource = compilation.compiler.webpack.sources.RawSource;
		const project = await this.getProjectConfig();
		compilation.emitAsset(
			"project.json",
			new RawSource(JSON.stringify(project, 0, compilation.options.mode === "development" ? 4 : 0)),
		);
		let ui = this.options.build.ui;
		if (ui) {
			if (!Array.isArray(ui)) {
				ui = [ui];
			}
			ui.forEach(fileName => {
				if (typeof fileName !== "string") {
					fileName = project.main;
				}
				compilation.updateAsset(
					fileName,
					(source) => {
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
		let logcat;
		compiler.hooks.done.tapPromise(AutojsDeployPlugin.name, async (stats) => {
			const compilation = stats.compilation;
			await this.deploy(compilation);
			if (!logcat) {
				logcat = true;
				this.logcat(compilation);
			}
		});
		if (this.options.logcat.sourceMap && !/source-map$/.test(compiler.options.devtool)) {
			compiler.options.devtool = "source-map";
		}
	}
}
module.exports = AutojsDeployPlugin;
