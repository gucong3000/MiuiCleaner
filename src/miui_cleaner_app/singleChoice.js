function singleChoice (title, items, defaultChoice) {
	const menuItems = items.map(item => item.appName || item.name || item.packageName);
	return items[dialogs.select(
		title,
		menuItems,
		defaultChoice,
	)];
}

module.exports = singleChoice;
