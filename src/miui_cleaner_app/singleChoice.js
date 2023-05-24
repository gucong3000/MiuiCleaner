const emitItemShowEvent = require("./emitItemShowEvent");
const project = require("./project.json");
const View = android.view.View;

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
					<relative w="*">
						<card w="*" margin="0 0 0 10" foreground="?selectableItemBackground">
							<horizontal gravity="center_vertical">
								<img id="icon" h="48" w="48" src="{{this.icon || '${icon}'}}" margin="10 10 0 10" />
								<vertical h="auto" layout_weight="1" margin="10 0">
									<text text="{{this.displayName || this.appName || this.name}}" textColor="#333333" textSize="16sp" maxLines="1" />
									<text text="{{this.summary}}" textColor="#999999" textSize="14sp" maxLines="1" />
								</vertical>
							</horizontal>
						</card>
					</relative>
				</list>
			</vertical>
		</frame>
	`);

	emitItemShowEvent(ui.itemList, icon);

	ui.itemList.on("item_click", (item, i, itemView, listView) => {
		console.log(`已点击：${item.displayName || item.appName || item.name}`);
		item.fn ? item.fn(item, itemView) : fn(item, itemView);
	});

	ui.itemList.on("item_long_click", (event, item, i, itemView, listView) => {
		if (item.url) {
			app.openUrl(item.url);
		}
	});

	function setDataSource (itemList) {
		itemList.forEach((item) => {
			if (item.icon && !/^\w+:\/\//.test(item.icon)) {
				item.icon = "file://" + files.path(item.icon);
			}
		});
		ui.itemList.setDataSource(itemList);
		ui.post(() => {
			ui.progress.setVisibility(View.GONE);
		});
	}

	global.activity.setSupportActionBar(ui.toolbar);
	if (itemList.then) {
		ui.progress.setVisibility(View.VISIBLE);
		threads.start(() => {
			itemList.then(itemList => {
				ui.post(() => {
					setDataSource(itemList);
				});
			});
		});
	} else {
		setDataSource(itemList);
	}
}

module.exports = singleChoice;
