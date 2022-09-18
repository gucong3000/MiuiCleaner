const requestPermission = require("./requestPermission");
const blur = require("./blur");

function startActivity (options) {
	options.className = options.className.replace(/^(?=\.)/, options.packageName);
	try {
		app.startActivity(options);
	} catch (ex) {
		console.error(ex.message);
		return;
	}
	requestPermission({
		accessibility: true,
	});
	blur();
}

module.exports = startActivity;
