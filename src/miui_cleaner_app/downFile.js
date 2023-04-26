const DownloadManager = android.app.DownloadManager;
const Cursor = android.database.Cursor;
const Intent = android.content.Intent;

const downloadManager = context.getSystemService(context.DOWNLOAD_SERVICE);
const mimeTypeMap = android.webkit.MimeTypeMap.getSingleton();
const emitter = events.emitter();

function getValOfCursor (cursor, columnName, columnType) {
	let columnIndex = cursor.getColumnIndex(columnName);
	if (columnIndex < 0) {
		columnName = DownloadManager["COLUMN_" + columnName] || DownloadManager[columnName];
		columnIndex = cursor.getColumnIndex(columnName);
	}
	if (columnIndex < 0) {
		return;
	}
	if (!columnType) {
		switch (cursor.getType(columnIndex)) {
			case Cursor.FIELD_TYPE_INTEGER:
				columnType = "Long";
				break;
			case Cursor.FIELD_TYPE_FLOAT:
				columnType = "Float";
				break;
			case Cursor.FIELD_TYPE_STRING:
				columnType = "String";
				break;
			case Cursor.FIELD_TYPE_BLOB:
				columnType = "Blob";
				break;
		}
	}
	return cursor[`get${columnType}`](columnIndex);
}

function queryDownList (callback, query) {
	const cursor = downloadManager.query(query || new DownloadManager.Query());
	const valueOf = getValOfCursor.bind(cursor, cursor);
	let result;
	if (cursor) {
		if (cursor.moveToFirst()) {
			do {
				if ((result = callback(valueOf))) {
					break;
				}
			} while (cursor.moveToNext());
		}
		cursor.close();
	}
	return result;
}

function guessFileName (disposition) {
	if (disposition) {
		const fileName = disposition.match(/(^|;)\s*filename\*?\s*=\s*(UTF-8(''|\/))?(.*?)(;|\s|$)/i);
		return fileName && decodeURI(fileName[4]);
	}
}

function readConfig (options) {
	// let disposition;
	// if (options.headers) {
	// 	Object.keys(options.headers).forEach(key => {
	// 		switch (key.toLowerCase()) {
	// 			case "content-disposition": {
	// 				disposition = options.headers[key];
	// 				break;
	// 			}
	// 			case "content-length": {
	// 				options.size = +options.headers[key];
	// 				break;
	// 			}
	// 			case "Content-Type": {
	// 				if (options.headers[key] !== "application/octet-stream") {
	// 					options.mimeType = options.headers[key];
	// 				}
	// 				break;
	// 			}
	// 		}
	// 	});
	// }
	options.location = decodeURI(options.location || options.url);
	if (!options.fileName) {
		options.fileName = (guessFileName(options.disposition) || android.webkit.URLUtil.guessFileName(options.location, null, null)).replace(/_(Coolapk|\d+)(?=\.\w+$)/i, "");
	}
	if (!options.mimeType || /^application\/octet-stream$/.test(options.mimeType)) {
		options.mimeType = mimeTypeMap.getMimeTypeFromExtension(files.getExtension(options.fileName));
	}
	return options;
}

function downFile (options) {
	options = readConfig(options);
	let downId;
	let complete;
	const downEmitter = Object.create(events.emitter());

	const promise = new Promise((resolve, reject) => {
		downEmitter.on("complete", resolve);
		// downEmitter.on("cancel", reject);
		// downEmitter.on("error", reject);
	});

	function emitProgressEvent (progressEvent) {
		if (!progressEvent.size) {
			progressEvent.size = options.size;
		}
		downEmitter.emit("progress", progressEvent);
	}

	function emitCompleteEvent (intent) {
		if (!intent) {
			intent = new Intent();
			intent.putExtra(DownloadManager.EXTRA_DOWNLOAD_ID, downId);
		}
		intent.setDataAndType(
			downloadManager.getUriForDownloadedFile(downId),
			options.mimeType,
		);
		intent.setAction(Intent.ACTION_VIEW);
		intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
		intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
		const googleInstaller = "com.google.android.packageinstaller";

		intent.setPackage(app.getAppName(googleInstaller) ? googleInstaller : null);

		downEmitter.emit("complete", intent);
		downEmitter.removeAllListeners();
		throttle[downId] = null;
		complete = true;
	}

	function startTask () {
		queryDownList((valueOf) => {
			if (options.location === valueOf("URI")) {
				downId = valueOf("ID");
			} else {
				return;
			}
			switch (valueOf("STATUS")) {
				case DownloadManager.STATUS_SUCCESSFUL: {
					emitCompleteEvent();
					break;
				}
				case DownloadManager.STATUS_PAUSED:
				case DownloadManager.STATUS_FAILED: {
					try {
						app.launchPackage("com.android.providers.downloads.ui");
					} catch (ex) {
						app.startActivity(new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS));
					}
					// falls through
				}
				default: {
					downEmitter.emit("start", downId);
					emitProgressEvent(createProgressEvent(valueOf));
				}
			}
			return true;
		});

		if (!downId) {
			const request = new DownloadManager.Request(android.net.Uri.parse(options.location));
			request.addRequestHeader("User-Agent", options.userAgent || android.webkit.WebSettings.getDefaultUserAgent(context));
			if (options.referer) {
				request.addRequestHeader("Referer", options.referer);
			}
			// request.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, options.fileName);
			request.setDestinationInExternalFilesDir(context, android.os.Environment.DIRECTORY_DOWNLOADS, options.fileName);
			request.setMimeType(options.mimeType);
			console.log("开始下载：", options);
			downId = downloadManager.enqueue(request);
			downEmitter.emit("start", downId);
		}

		emitter.on(`${downId}.click`, (...args) => downEmitter.emit("click", ...args));

		if (!complete) {
			emitter.on(`${downId}.progress`, emitProgressEvent);
			emitter.once(`${downId}.complete`, (...args) => {
				console.log("下载完毕：", options);
				emitter.removeAllListeners(`${downId}.complete`);
				emitter.removeAllListeners(`${downId}.progress`);
				emitCompleteEvent(...args);
				// emitter.removeAllListeners(`${downId}.click`);
			});
			startDownReceiver();
		}
	}
	downEmitter.then = (...args) => promise.then(...args);
	setTimeout(startTask, 0);
	return downEmitter;
}

function registerReceiver (sysActionName, onReceive) {
	context.registerReceiver(
		new JavaAdapter(android.content.BroadcastReceiver, {
			onReceive,
		}),
		new android.content.IntentFilter(sysActionName),
	);
}

registerReceiver(DownloadManager.ACTION_DOWNLOAD_COMPLETE, (context, intent) => {
	emitter.emit(`${intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)}.complete`, intent);
});

registerReceiver(DownloadManager.ACTION_NOTIFICATION_CLICKED, (context, intent) => {
	intent.getLongArrayExtra(DownloadManager.EXTRA_NOTIFICATION_CLICK_DOWNLOAD_IDS).forEach(downId => {
		emitter.emit(`${downId}.click`, intent);
	});
});

function createProgressEvent (valueOf) {
	// 已经下载文件大小
	const progress = valueOf("BYTES_DOWNLOADED_SO_FAR");
	const speed = valueOf("downloading_current_speed");
	// 下载文件的总大小
	const size = valueOf("TOTAL_SIZE_BYTES");
	return {
		progress,
		speed: speed >= 0 ? speed : null,
		size,
	};
}

let downStatus = false;
let throttle = {};

function downReceiver () {
	let running;
	queryDownList(valueOf => {
		if (valueOf("STATUS") === DownloadManager.ACTION_DOWNLOAD_COMPLETE) {
			return;
		}
		const downId = valueOf("ID");
		const progressEvent = createProgressEvent(valueOf);
		if (progressEvent.progress > 0 || progressEvent.size > 0) {
			const key = JSON.stringify(progressEvent);
			if (throttle[downId] !== key) {
				emitter.emit(`${downId}.progress`, progressEvent);
				throttle[downId] = key;
			}
		}
		running = true;
	});
	if (running) {
		setTimeout(downReceiver, 0x200);
	} else {
		throttle = {};
	}
	downStatus = running || false;
}
function startDownReceiver () {
	if (!downStatus) {
		downReceiver();
	}
}

downFile.queryDownList = queryDownList;
module.exports = downFile;
