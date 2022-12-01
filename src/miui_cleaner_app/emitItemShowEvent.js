const debounce = require("debounce");
const Rect = android.graphics.Rect;
const inNightMode = Boolean(activity.getApplicationContext().getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_YES);
function emitItemShowEvent (listView, defaultIcon) {
	const itemList = new Map();
	listView.on("item_bind", function (itemView, itemHolder) {
		itemList.set(itemView, itemHolder);
		setTimeout(() => {
			listView.emit("item_show", itemHolder.item, itemView, listView);
			if (itemHolder.item.loadIcon || (itemHolder.item.icon && /^https?:/i.test(itemHolder.item.icon))) {
				itemView.icon.clearColorFilter();
			}
		}, 0);
	});
	listView.on("scroll_change", debounce(() => {
		const parentRect = new Rect();
		listView.getGlobalVisibleRect(parentRect);
		function isVisible (target) {
			const rect = new Rect();
			target.getGlobalVisibleRect(rect);
			return parentRect.contains(rect) || parentRect.intersect(rect);
		}
		itemList.forEach((itemHolder, itemView) => {
			if (isVisible(itemView)) {
				listView.emit("item_show", itemHolder.item, itemView, listView);
			}
		});
	}, 80));
	listView.on("item_show", function (item, itemView, listView) {
		const imageView = itemView.icon;
		if (item.loadIcon) {
			imageView.setImageDrawable(item.loadIcon());
		} else if (!(item.icon && /^https?:/i.test(item.icon))) {
			imageView.setColorFilter(android.graphics.Color.parseColor(inNightMode ? "#FFCCCCCC" : "#FF333333"));
			return;
		}
		imageView.clearColorFilter();
	});
}
module.exports = emitItemShowEvent;
