function startActivity (options) {
	if (options.className) {
		options.className = options.className.replace(/^(?=\.)/, options.packageName);
	}
	try {
		app.startActivity(options);
	} catch (ex) {
		console.error(ex.message);
	}
}

module.exports = startActivity;
