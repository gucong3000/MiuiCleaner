const { Adb } = require("@devicefarmer/adbkit");
const { readFile } = require("fs/promises");
const EventEmitter = require("events");
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
		this.adb = Adb.createClient(this.options.adb);
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
			stdout: process.stdout,
			sourceMap: true,
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

	// 日志显示功能，AutoJS Pro可直接使用，AutoX需要在项目代码中配置日志文件路径：`console.setGlobalLogConfig({file: files.join(context.getExternalFilesDir("logs"),"log.txt")});`
	async logcat (compilation) {
		if (!this.options.logcat) {
			return;
		}

		const project = await this.getProjectConfig();
		const logcat = async (device, packageName) => {
			if (!packageName) {
				return;
			}
			let cmd = compilation.compiler.options.watch ? "tail -f" : "cat";
			cmd += ` /storage/emulated/0/Android/data/${packageName}/files/logs/log.txt`;
			const log = await device.shell(cmd);
			const transform = new LogTransform();
			const stdout = this.options.logcat.stdout || process.stdout;
			transform.colors = stdout.hasColors && stdout.hasColors() && (this.options.logcat.colors || transform.colors);
			transform.sourceMap = this.options.logcat.sourceMap;
			const startOptput = () => {
				console.log("> adb shell", cmd);
				log.pipe(
					transform,
				).pipe(
					stdout,
				);
			};
			if (compilation.compiler.options.watch) {
				log.once("data", startOptput);
			} else {
				startOptput();
			}
			this.options.logcat.manager.once("close", () => log.end());
			return log;
		};
		const start = async (device) => {
			return await Promise.all(
				[
					project.packageName,
					device.packageName,
				].map(packageName => logcat(device, packageName)),
			);
		};
		if (this.options.logcat.manager) {
			this.options.logcat.manager.emit("close");
		} else {
			this.options.logcat.manager = new EventEmitter();
			if (compilation.compiler.options.watch) {
				process.nextTick(async () => {
					const tracker = await this.adb.trackDevices();
					tracker.on("add", async (device) => {
						device = this.adb.getDevice(device.id);
						await device.waitForDevice();
						await this.getPackageName(device);
						await start(device);
					});
				});
			}
		}
		await this.eachDevice(start);
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
			devices.map(async (device) => {
				await this.getPackageName(device);
				return device.packageName && device;
			}),
		)).filter(Boolean);
		return await Promise.all(devices.map(...args));
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
		const project = await this.getProjectConfig();

		if (compilation.compiler.options.watch && this.options.logcat?.sourceMap) {
			this.options.logcat.sourceMap = {};
			const remoteDir = project.projectDirectory;
			const posixPath = (sPath) => (path.isAbsolute(sPath) ? path.relative(process.cwd(), sPath) : sPath).replaceAll(path.win32.sep, path.posix.sep);
			const contextPath = posixPath(compilation.options.context);
			const outputPath = posixPath(compilation.compiler.outputPath);

			compilation.getAssets().forEach((asset) => {
				if ("development" in asset.info) {
					const sourceMap = JSON.parse(asset.source.source());
					sourceMap.sources = sourceMap.sources.map(file => {
						const uri = file.match(/^webpack:\/\/([^/]+\/)?\.\/(.*)$/);
						if (uri) {
							return path.posix.join(contextPath, uri[2]);
						}
						return file;
					});
					const file = sourceMap.file;
					sourceMap.file = path.posix.join(outputPath, file);
					this.options.logcat.sourceMap[path.posix.join(remoteDir, file)] = new SourceMapConsumer(sourceMap);
				}
			});
		}
		if (!this.options.build) {
			return;
		}
		const RawSource = compilation.compiler.webpack.sources.RawSource;
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
		compiler.hooks.done.tapPromise(AutojsDeployPlugin.name, async (stats) => {
			const compilation = stats.compilation;
			try {
				await this.deploy(compilation);
			} catch (ex) {
				if (ex.cause?.code === "ENOENT") {
					console.error("Could not find 'adb' in PATH. Please set options.adb of " + AutojsDeployPlugin.name);
				} else {
					throw ex;
				}
			}
			if (compilation.compiler.options.watch) {
				await this.logcat(compilation);
			}
		});
	}
}
module.exports = AutojsDeployPlugin;

const { Transform } = require("stream");
const styles = require("ansi-styles");
const json5 = require("json5");
class LogTransform extends Transform {
	constructor () {
		super();
		this.colors = {
			V: styles.gray,
			I: styles.green,
			W: styles.yellow,
			E: styles.red,
		};
		// "https://cdn.jsdelivr.net/gh/kkevsekk1/AutoX/autojs/src/main/assets",
		// "https://github.dev/kkevsekk1/AutoX/tree/dev-test/autojs/src/main/assets"
		this.assets = "https://github.dev/kkevsekk1/AutoX/tree/dev-test/autojs/src/main/assets";
	}

	// 将文件路径转换为source map映射的文件路径
	toSourcePath (options) {
		const consumer = this.sourceMap && this.sourceMap[options.file];
		if (consumer) {
			const originalPos = consumer.originalPositionFor && consumer.originalPositionFor(options);
			if (originalPos?.source) {
				options.file = originalPos.source;
				if (originalPos.name && (!options.name || !(/\b\w*E(rror|xception):/.test(options.name) || options.name.includes(originalPos.name)))) {
					options.name = originalPos.name;
				}
				options.line = originalPos.line;
				options.column = originalPos.column;
			} else {
				options.file = consumer.file || consumer;
			}
		}
		return options;
	}

	// 将日志中的错误信息中的trace统一格式并转换文件路径
	traceFormat (options) {
		if (options.pos) {
			const arrPos = options.pos.match(/\d+/g);
			options.line = +arrPos[0] || 1;
			options.column = +arrPos[1] || 0;
		}
		let {
			file,
			prefix,
			name,
			line,
			column,
		} = this.toSourcePath(options);
		if (file.startsWith("file:///android_asset/modules/")) {
			file = this.assets + file.slice(21) + "#L" + line;
		} else {
			file = [file, line || "1", column || "0"].join(":");
		}
		prefix = prefix || "";
		if (name) {
			return `${prefix}${name} (${file})`;
		} else {
			return `${prefix}${file}`;
		}
	}

	_transform (string, encoding, callback) {
		string = string.toString();
		if (this.sourceMap) {
			string = string.replaceAll(
				/\bfile:\/\/\/android_asset(\/.*?)#(\d+)/g,
				// "https://cdn.jsdelivr.net/gh/kkevsekk1/AutoX/autojs/src/main/assets/modules/__json2__.js#L493",
				// "https://github.dev/kkevsekk1/AutoX/tree/dev-test/autojs/src/main/assets" + file + "#L" + line,
				(s, file, line) => this.assets + file + "#L" + line,
			).replaceAll(
				// 替换以下两种错误日志格式中的文件路径和行号(文件路径和行号带括号)：
				// XxxError: error_messarg (/some/path/to/file:69:54)
				//     at function_name (/some/path/to/file:69:54)
				/^((?:[\d:.]+\/[A-Z]:|\s*at)\s+)?(.*?)\s+\((.*?)((?:[:#]\d+)+)\)$/gm,
				(s, prefix, name, file, pos) => this.traceFormat({
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
				(s, prefix, file, pos, name) => this.traceFormat({
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
						errInfo = json5.parse(`{${jsonBody}}`);
					} catch (ex) {
						// return s;
					}
					if (!errInfo || !errInfo.fileName || !/\b\w*E(rror|xception)/.test(message)) {
						return s;
					}
					return `${message}\n${this.traceFormat({
						prefix: "\tat ",
						file: errInfo.fileName,
						line: +errInfo.lineNumber,
						column: +errInfo.columnNumber,
					})}`;
				},
			);
		}
		if (this.colors) {
			let currColor = null;
			string = string.replaceAll(/^([\d:.]+)\/([A-Z]):\s/gm, (s, timestamp, level) => {
				s = "";
				const newColor = this.colors[level] || null;
				if (newColor !== currColor) {
					if (currColor) {
						s += currColor.close;
					}
					if (newColor) {
						s += newColor.open;
					}
					currColor = newColor;
				}
				// if (this.timestamp) {
				// 	s += `${timestamp}/${level}: `;
				// }
				return s;
			});
			if (currColor) {
				string += currColor.close;
				currColor = null;
			}
		}
		callback(null, string);
	}

	_flush (callback) {
		callback();
	}
}

// require("fs").createReadStream("lot.txt").pipe(process.output);
// const fs = require("fs");
// const logCat = new LogCat();
// const sourceMap = JSON.parse(
// 	fs.readFileSync("dist/miui_cleaner_app/main.js.map", "utf-8"),
// );

// let context = process.cwd();
// let output = path.resolve("dist/miui_cleaner_app");
// context = path.relative(process.cwd(), context);
// output = path.relative(process.cwd(), output).replaceAll(path.win32.sep, path.posix.sep);
// sourceMap.sources = sourceMap.sources.map(file => {
// 	const uri = file.match(/^webpack:\/\/([^/]+\/)?(\.\/.*)$/);
// 	if (uri) {
// 		return path.posix.join(context, uri[2]);
// 	}
// 	return file;
// });
// sourceMap.file = path.posix.join(output, "main.js");
// logCat.sourceMap = {
// 	"/storage/emulated/0/脚本/com.github.gucong3000.miui.cleaner/main.js": "dist/miui_cleaner_app/main.js" || new SourceMapConsumer(sourceMap),
// };
// fs.createReadStream("log.txt").pipe(logCat).pipe(process.stdout);
