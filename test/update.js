const assert = require("chai").assert;
const proxyRequire = require("proxyquire").noCallThru();
const update = proxyRequire("../src/miui_cleaner_app/update", {
	[require.resolve("../src/miui_cleaner_app/dialogs")]: {},
	[require.resolve("../src/miui_cleaner_app/downFile")]: {},
});

describe("APP自动升级", () => {
	let remote;
	let fileInfo;
	it("读取远程信息", async function () {
		this.timeout(0xFFF);
		remote = await update.loadRemote();
		assert.ok(Number.isInteger(remote.versionCode), "versionCode 为整数");
		assert.match(remote.versionName, /^(\d+\.)+\d+$/, "versionName 为\\d\\.\\d");
		assert.equal(remote.name, "MiuiCleaner", "name === \"MiuiCleaner\"");
		assert.equal(remote.packageName, "com.github.gucong3000.miui.cleaner", "packageName === \"com.github.gucong3000.miui.cleaner\"");
		return remote;
	});
	it("读取文件信息", async function () {
		if (!remote) {
			this.skip();
		}
		this.timeout(0xFFF);

		fileInfo = await update.loadFileInfo(remote);
		assert.isAbove(fileInfo.size, 0xFFFFF, "文件体积异常");
		assert.match(fileInfo.url, /^https?:\/\/github.com\/.*\/download\/.*\/MiuiCleaner\.apk$/);
		assert.equal(fileInfo.fileName, "MiuiCleaner.apk");
		assert.equal(fileInfo.contentType, "application/vnd.android.package-archive");
		assert.match(fileInfo.versionName, /\d+(\.\d+)/);
		assert.notOk(fileInfo.location);
		const location = await fileInfo.getLocation();
		assert.equal(location, await fileInfo.getLocation());
		assert.notEqual(location, fileInfo.url);
		assert.equal(location, fileInfo.location);
	});
});
