const requestSettings = require("./requestSettings");
const blur = require("./blur");

function startActivity (options) {
	options.className = options.className.replace(/^(?=\.)/, options.packageName);
	try {
		app.startActivity(options);
	} catch (ex) {
		console.error(ex.message);
		return;
	}
	requestSettings({
		accessibility: true,
	});
	blur();
}

module.exports = startActivity;
