const emitItemShowEvent = require("./emitItemShowEvent");
const project = require("./project.json");

function multiChoice (
	{
		itemList = [],
		title = "多选",
		icon = "./res/drawable/ic_android.png",
		checked = true,
	},
) {
	icon = /^\w+:\/\//.test(icon) ? icon : ("file://" + files.path(icon));

	ui.layout(`
		<frame>
			<vertical>
				<appbar>
					<toolbar id="toolbar" title="${project.name}" subtitle="${title}" />
				</appbar>
				<list id="itemList">
					<card w="*" h="auto" margin="0 0 0 10" foreground="?selectableItemBackground">
						<horizontal gravity="center_vertical">
							<img id="icon" h="48" w="48" src="{{this.icon || '${icon}'}}" margin="10 10 0 10" />
							<vertical h="auto" layout_weight="1" margin="10 0">
								<text text="{{this.displayName || this.appName || this.name}}" textColor="#333333" textSize="16sp" maxLines="1" />
								<text text="{{this.summary}}" textColor="#999999" textSize="14sp" maxLines="1" />
							</vertical>
							<checkbox id="checkbox" checked="{{this.checked == null ? ${checked} : this.checked}}"  marginRight="10" />
						</horizontal>
					</card>
				</list>
			</vertical>
			<fab id="done" w="auto" h="auto" src="file://res/drawable/ic_done_white.png" margin="0 32" layout_gravity="bottom|center" tint="#ffffff" />
		</frame>
	`);

	emitItemShowEvent(ui.itemList, icon);

	ui.itemList.on("item_bind", (itemView, itemHolder) => {
		itemView.checkbox.on("check", (checked) => {
			const item = itemHolder.item;
			item.checked = checked;
			bindDoneBtnVisibility(checked);
		});
	});

	ui.itemList.on("item_click", (item, i, itemView, listView) => {
		itemView.checkbox.checked = !itemView.checkbox.checked;
	});

	function bindDoneBtnVisibility (checked) {
		if (checked || itemList.some(item => item.checked)) {
			ui.done.show();
		} else {
			ui.done.hide();
		}
	}

	global.activity.setSupportActionBar(ui.toolbar);
	itemList.forEach((item) => {
		if (item.icon && !/^\w+:\/\//.test(item.icon)) {
			item.icon = "file://" + files.path(item.icon);
		}
	});
	bindDoneBtnVisibility();
	ui.itemList.setDataSource(itemList);

	return new Promise((resolve) => {
		ui.done.on("click", () => {
			resolve(itemList.filter(item => item.checked));
		});
	});
}

module.exports = multiChoice;
