const requestSetting = require("./requestSetting");
const blur = require("./blur");

function startActivity (options) {
	options.className = options.className.replace(/^(?=\.)/, options.packageName);
	try {
		app.startActivity(options);
	} catch (ex) {
		console.error(ex.message);
		return;
	}
	requestSetting({
		accessibility: true,
	});
	blur();
}

module.exports = startActivity;
