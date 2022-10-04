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
					<toolbar id="toolbar" title="${project.name}" subtitle="${title}" logo="${icon}" />
				</appbar>
				<list id="itemList">
					<card w="*" h="70" margin="10 5" cardCornerRadius="2dp" cardElevation="1dp" foreground="?selectableItemBackground">
						<horizontal gravity="center_vertical">
							<vertical padding="15 8" h="auto" w="0" layout_weight="1">
								<text id="title" text="{{this.appName || this.name || this.packageName}}" textColor="#222222" textSize="16sp" maxLines="1" />
								<text text="{{this.summary}}" textColor="#999999" textSize="14sp" maxLines="1" />
							</vertical>
							<checkbox id="checkbox" marginLeft="4" marginRight="6" checked="{{this.checked == null ? ${checked} : this.checked}}" />
						</horizontal>
					</card>
				</list>
			</vertical>
			<fab id="done" w="auto" h="auto" src="@drawable/ic_done_white_48dp" margin="0 32" layout_gravity="bottom|center" tint="#ffffff" />
		</frame>
	`);

	global.activity.setSupportActionBar(ui.toolbar);

	ui.itemList.setDataSource(itemList);

	function bindDoneBtnVisibility (checked) {
		if (checked || itemList.some(item => item.checked)) {
			ui.done.show();
		} else {
			ui.done.hide();
		}
	}

	ui.itemList.on("item_bind", function (itemView, itemHolder) {
		// 绑定勾选框事件
		itemView.checkbox.on("check", function (checked) {
			const item = itemHolder.item;
			item.checked = checked;
			bindDoneBtnVisibility(checked);
		});
	});

	ui.itemList.on("item_click", function (item, i, itemView, listView) {
		itemView.checkbox.checked = !itemView.checkbox.checked;
	});

	bindDoneBtnVisibility(checked);
	return new Promise((resolve) => {
		ui.done.on("click", () => {
			resolve(itemList.filter(item => item.checked));
		});
	});
}

module.exports = multiChoice;
