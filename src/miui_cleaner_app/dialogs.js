const AlertDialog = android.app.AlertDialog;
const EditText = android.widget.EditText; ;

const R = com.stardust.autojs.R;

const dialogs = {
	confirm,
	alert,
	prompt,
};

function alertDialogBuilder (
	message,
	{
		title,
		positive = true,
		negative = true,
		cancelable = false,
		view,
	},
) {
	const builder = new AlertDialog.Builder(activity);
	if (title) {
		builder.setTitle(title);
	}
	if (message) {
		builder.setMessage(message);
	}
	if (view) {
		builder.setView(view);
	}
	builder.setCancelable(cancelable);
	return new Promise(resolve => {
		builder.setPositiveButton(
			typeof positive === "string" ? positive : R.string.ok,
			{
				onClick: () => resolve(true),
			},
		);
		if (negative) {
			builder.setNegativeButton(
				typeof negative === "string" ? negative : R.string.cancel,
				{
					onClick: () => resolve(false),
				},
			);
		}
		if (cancelable) {
			builder.setOnCancelListener({
				onCancel: () => resolve(null),
			});
		}

		const dialog = builder.create();
		dialog.show();
	});
}

function confirm (
	message,
	options,
) {
	return alertDialogBuilder(
		message,
		options,
	);
}

function alert (
	message,
	options,
) {
	return alertDialogBuilder(
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
	options = {},
) {
	if (!options.view) {
		options.view = new EditText(activity);
		if (value) {
			options.view.setText(value);
		}
	}
	return alertDialogBuilder(
		message,
		options,
	).then(result => {
		if (result) {
			return options.view.getText().toString();
		} else {
			return null;
		}
	});
}

module.exports = dialogs;
