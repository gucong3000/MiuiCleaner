function multiChoice (title, items, defaultValue = true) {
	const indices = [];
	const menuItems = items.map(item => item.appName || item.name || item.packageName);

	items.forEach((item, index) => {
		if (item.checked == null ? defaultValue : item.checked) {
			indices.push(index);
		}
	});

	const selectedes = dialogs.multiChoice(
		title,
		menuItems,
		indices,
	);
	return selectedes.map(index => items[index]);
}

module.exports = multiChoice;
