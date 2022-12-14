
function waitForBack (leave) {
	return new Promise((resolve) => {
		const timer = setTimeout(resolve, 0x200);
		ui.emitter.once("pause", () => {
			ui.emitter.once("resume", resolve);
			clearTimeout(timer);
		});
		if (leave) {
			setTimeout(leave, 0);
		};
	});
};

module.exports = waitForBack;
