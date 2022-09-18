const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

class AutojsDeployPlugin {
	sendCmd (cmd, path) {
		console.log("执行命令：", cmd);
		path = encodeURI(path);
		const req = http.get("http://127.0.0.1:9317/exec?cmd=" + cmd + "&path=" + path, (res) => {
			res.setEncoding("utf8");
			res.on("data", console.log).on("error", console.error);
		});
		req.on("error", function () {
			console.error("自动" + cmd + "失败,autox.js服务未启动");
			console.error("请使用 ctrl+shift+p 快捷键，启动auto.js服务");
		});
	}

	constructor (options = {}) {
		this.options = {
			command: [
				"npm",
				"run",
				"deploy",
			],
			save: false,
			rerun: true,
			...options,
		};
	}

	apply (compiler) {
		compiler.hooks.done.tap("AutojsDeployPlugin", (stats) => {
			const options = this.options;
			if (options.command) {
				const command = options.command;
				const exec = command[0];
				const args = command.slice(1).map((arg) => (
					(typeof arg === "function") ? arg.call(compiler, stats) : arg
				));
				console.log(exec, args.join(" "));
				spawn(
					exec,
					args,
					{
						stdio: "pipe",
						shell: true,
						...options,
					},
				);
			}
			if (options.save) {
				this.sendCmd("save", "/" + compiler.outputPath);
			}
			if (options.rerun) {
				for (const [fileName, info] of stats.compilation.assetsInfo) {
					if ("javascriptModule" in info) {
						this.sendCmd("rerun", "/" + path.join(compiler.outputPath, fileName));
					}
				}
			}
		});
	}
}
module.exports = AutojsDeployPlugin;
