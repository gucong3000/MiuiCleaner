let scriptEngine;
function sleep (time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}

function waitForEngineStart () {
	return sleep(0x50).then(() => {
		if (scriptEngine.engine) {
			return scriptEngine.engine;
		} else {
			return waitForEngineStart();
		}
	});
}

function waitForEngineStop () {
	return sleep(0x50).then(() => {
		if (scriptEngine && scriptEngine.engine && !scriptEngine.engine.destroyed) {
			return waitForEngineStart();
		}
	});
}

function getEngine (task) {
	return Promise.resolve().then(() => {
		if (!scriptEngine || !scriptEngine.engine || scriptEngine.engine.destroyed) {
			if (DEBUG && /^\[remote\]/.test(engines.myEngine().source.toString())) {
				scriptEngine = engines.execScriptFile("./miui_cleaner_app/services.js");
			} else {
				scriptEngine = engines.execScriptFile("./services.js");
			}
		}
	});
}

// function runAutoActions (cleanerList) {
// 	(
// 		cleanerList.length
// 			? serviceMgr(cleanerList.shift())
// 			: Promise.resolve()
// 	).then(() => {
// 		return runAutoActions(cleanerList);
// 	});
// }

function start (taskList) {
	files.write(
		files.join(
			context.getFilesDir(),
			"taskList.json",
		),
		JSON.stringify(
			taskList.map(taskInfo => ({
				packageName: taskInfo.packageName,
				action: taskInfo.action,
				name: taskInfo.name || taskInfo.appName,
			})),
		),
	);
	return getEngine().then(waitForEngineStart).then(waitForEngineStop);
}

module.exports = start;
