const emitItemShowEvent = require("./emitItemShowEvent");
const project = require("./project.json");

function singleChoice (
	{
		itemList,
		title,
		icon = "./res/drawable/ic_android.png",
		fn = null,
	},
) {
	icon = /^\w+:\/\//.test(icon) ? icon : ("file://" + files.path(icon));

	ui.layout(`
		<frame>
			<vertical>
				<appbar>
					<toolbar id="toolbar" title="${project.name}" subtitle="${title}" />
				</appbar>
				<relative id="progress" h="*" visibility="gone">
					<progressbar layout_centerInParent="true" />
				</relative>
				<list id="itemList">
					<card w="*" h="auto" margin="0 0 0 10" foreground="?selectableItemBackground">
						<horizontal gravity="center_vertical">
							<img id="icon" h="48" w="48" src="{{this.icon || '${icon}'}}" margin="10 10 0 10" />
							<vertical h="auto" layout_weight="1" margin="10 15">
								<text text="{{this.displayName || this.appName || this.name}}" textColor="#333333" textSize="16sp" maxLines="1" />
								<text text="{{this.summary}}" textColor="#999999" textSize="14sp" maxLines="1" />
							</vertical>
						</horizontal>
					</card>
				</list>
			</vertical>
		</frame>
	`);

	emitItemShowEvent(ui.itemList, icon);

	ui.itemList.on("item_click", function (item, i, itemView, listView) {
		console.log(`已点击：${item.displayName || item.appName || item.name}`);
		item.fn ? item.fn(item) : fn(item);
	});

	function setDataSource (itemList) {
		itemList.forEach((item) => {
			if (item.icon && !/^\w+:\/\//.test(item.icon)) {
				item.icon = "file://" + files.path(item.icon);
			}
		});
		ui.itemList.setDataSource(itemList);
		setTimeout(() => {
			ui.progress.setVisibility(android.view.View.GONE);
		}, 1);
	}

	global.activity.setSupportActionBar(ui.toolbar);
	if (itemList.then) {
		ui.progress.setVisibility(android.view.View.VISIBLE);
		threads.start(function () {
			itemList.then(itemList => {
				ui.run(() => {
					setDataSource(itemList);
				});
			});
		});
	} else {
		setDataSource(itemList);
	}
}

module.exports = singleChoice;
