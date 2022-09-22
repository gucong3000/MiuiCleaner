const requestSetting = require("./requestSetting");
const blur = require("./blur");

function notification () {
	const opts = {
		packageName: "com.miui.notification",
		className: "miui.notification.management.activity.NotificationAppListActivity",
	};

	try {
		app.startActivity(opts);
	} catch (ex) {
		console.error(ex.message);
		return;
	}
	requestSetting({
		accessibility: true,
	});
	blur();
}

module.exports = notification;
