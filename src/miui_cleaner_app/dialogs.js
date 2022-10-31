const resString = com.stardust.autojs.R.string;
const AlertDialog = android.app.AlertDialog;

const btnLabelMap = {
	positive: resString.ok,
	negative: resString.cancel,
};

function alertDialog (
	message,
	options,
) {
	options = {
		positive: true,
		negative: true,
		neutral: false,
		cancelable: false,
		message,
		...options,
	};
	const builder = new AlertDialog.Builder(activity);
	const emitter = options.emitter || events.emitter();

	function createListener (eventKeyName, eventName) {
		const listener = {};
		listener[`on${eventKeyName}`] = (...args) => {
			console.log("对话框事件：", eventName);
			emitter.emit(eventName, ...args);
		};
		return listener;
	}

	function setAttr (dialog, filter) {
		let keys = Object.keys(dialog);
		if (filter) {
			keys = keys.filter(filter);
		}
		keys.forEach(key => {
			key = key.match(/^set?(On)?(\w+?)(Button|Listener)?$/);
			if (!key) {
				return;
			}
			const setName = key[0];
			const attrKeyName = key[2];
			const attrName = attrKeyName.replace(/^\w/, w => w.toLowerCase());
			const type = key[3] || attrKeyName;
			let attrValue;
			if (type === "Listener") {
				attrValue = createListener(attrKeyName, attrName.replace(/[A-Z]/, w => "_" + w.toLowerCase()));
			} else if (attrName in options) {
				attrValue = options[attrName];
				if (type === "Button") {
					if (attrValue) {
						attrValue = [
							typeof attrValue === "string" ? attrValue : btnLabelMap[attrName],
							attrValue = createListener("Click", attrName),
						];
					} else {
						return;
					}
				}
			} else {
				return;
			}
			if (!Array.isArray(attrValue)) {
				attrValue = [attrValue];
			}
			dialog[setName](...attrValue);
		});
	}

	if (options.view) {
		const frame = ui.inflate("<frame padding=\"22 0\"></frame >");
		let viewList = options.view;
		viewList = Array.isArray(options.view) ? viewList : [viewList];
		viewList.forEach(view => {
			if (typeof view === "string") {
				view = ui.inflate(view, frame);
			}
			frame.addView(view);
		});
		options.view = frame;
	}

	setAttr(builder);

	return Object.assign(Object.create(ui.run(() => {
		const dialog = builder.create();
		setAttr(dialog, attrName => !builder[attrName]);
		dialog.show();
		console.log(`对话框：“${message}”`);
		return dialog;
	})), {
		emitter,
		then: (...args) => {
			return new Promise(resolve => {
				emitter.once("positive", () => { resolve(true); });
				emitter.once("negative", () => { resolve(false); });
				emitter.once("neutral", () => { resolve(null); });
				emitter.once("cancel", () => { resolve(); });
			}).then(...args);
		},
	});
}

function confirm (
	message,
	options,
) {
	return alertDialog(
		message,
		{
			...options,
		},
	);
}

function alert (
	message,
	options,
) {
	return alertDialog(
		message,
		{
			negative: false,
			...options,
		},
	).then(() => {});
}

function prompt (
	message,
	value,
	options,
) {
	const view = options.view || ui.inflate(`<input text="${value || ""}" />`);
	return alertDialog(
		message,
		{
			view,
			...options,
		},
	).then(result => {
		if (result) {
			return view.getText().toString();
		} else {
			return null;
		}
	});
}

module.exports = Object.assign(alertDialog, {
	confirm,
	alert,
	prompt,
});
