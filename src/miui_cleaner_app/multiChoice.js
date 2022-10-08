const emitItemShowEvent = require("./emitItemShowEvent");
const project = require("./project.json");

function multiChoice (
	{
		itemList = [],
		title = "多选",
		icon = "@drawable/ic_launcher",
		checked = true,
	},
) {
	ui.layout(`
		<frame>
			<vertical>
				<appbar>
					<toolbar id="toolbar" title="${project.name}" subtitle="${title}" />
				</appbar>
				<list id="itemList">
					<card w="*" h="auto" margin="0 0 0 10" foreground="?selectableItemBackground">
						<horizontal gravity="center_vertical">
							<img id="icon" h="48" w="48" src="{{this.icon == null ? '${icon}' : this.icon}}" margin="10 10 0 10" />
							<vertical h="auto" layout_weight="1" margin="10 15">
								<text text="{{this.appName || this.name || this.packageName}}" textColor="#222222" textSize="16sp" maxLines="1" />
								<text text="{{this.summary}}" textColor="#999999" textSize="14sp" maxLines="1" />
							</vertical>
							<checkbox id="checkbox" checked="{{this.checked == null ? ${checked} : this.checked}}"  marginRight="10" />
						</horizontal>
					</card>
				</list>
			</vertical>
			<fab id="done" w="auto" h="auto" src="@drawable/ic_done_white_48dp" margin="0 32" layout_gravity="bottom|center" tint="#ffffff" />
		</frame>
	`);

	emitItemShowEvent(ui.itemList, icon);

	ui.itemList.on("item_bind", function (itemView, itemHolder) {
		itemView.checkbox.on("check", function (checked) {
			const item = itemHolder.item;
			item.checked = checked;
			bindDoneBtnVisibility(checked);
		});
	});

	ui.itemList.on("item_click", function (item, i, itemView, listView) {
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
	ui.itemList.setDataSource(itemList);
	bindDoneBtnVisibility(checked);

	return new Promise((resolve) => {
		ui.done.on("click", () => {
			resolve(itemList.filter(item => item.checked));
		});
	});
}

module.exports = multiChoice;
