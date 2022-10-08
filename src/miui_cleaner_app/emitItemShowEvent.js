const Rect = android.graphics.Rect;

function emitItemShowEvent (listView, defaultIcon) {
	const itemList = new Map();
	const itemVisible = new Map();
	listView.on("item_bind", function (itemView, itemHolder) {
		itemList.set(itemView, itemHolder);
	});
	listView.on("scroll_change", () => {
		const parentRect = new Rect();
		listView.getGlobalVisibleRect(parentRect);
		function isVisible (target) {
			const rect = new Rect();
			target.getGlobalVisibleRect(rect);
			return parentRect.contains(rect) || parentRect.intersect(rect);
		}
		itemList.forEach((itemHolder, itemView) => {
			if (isVisible(itemView)) {
				if (!itemVisible.get(itemView)) {
					listView.emit("item_show", itemHolder.item, itemView, listView);
				}
				itemVisible.set(itemView, true);
			} else {
				itemVisible.set(itemView, false);
			}
		});
	});

	listView.on("item_show", function (item, itemView, listView) {
		const imageView = itemView.icon;
		if (item.loadIcon) {
			imageView.setImageDrawable(item.loadIcon());
		}
	});
}
module.exports = emitItemShowEvent;
