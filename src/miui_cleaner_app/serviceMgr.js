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
			return waitForEngineStop();
		}
	});
}

function getEngine (task) {
	return Promise.resolve().then(() => {
		if (!scriptEngine || !scriptEngine.engine || scriptEngine.engine.destroyed) {
			scriptEngine = engines.execScriptFile("./services.js");
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

function parseTaskInfo (taskInfo) {
	return {
		packageName: taskInfo.packageName,
		action: taskInfo.action,
		name: taskInfo.name || taskInfo.appName,
		checked: taskInfo.checked,
	};
}

function start (taskList) {
	files.write(
		files.join(
			context.getExternalFilesDir(null),
			"taskList.json",
		),
		JSON.stringify(
			Array.isArray(taskList)
				? taskList.map(parseTaskInfo)
				: parseTaskInfo(taskList),
		),
	);
	return getEngine().then(waitForEngineStart).then(waitForEngineStop);
}

module.exports = start;
