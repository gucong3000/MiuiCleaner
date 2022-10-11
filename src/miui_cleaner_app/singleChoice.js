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
			<fab id="load" w="auto" h="auto" src="@drawable/ic_check_for_updates" layout_gravity="center|center" tint="#ffffff" />
		</frame>
	`);

	emitItemShowEvent(ui.itemList, icon);

	ui.itemList.on("item_click", function (item, i, itemView, listView) {
		item.fn ? item.fn(item) : fn(item);
	});

	function setDataSource (itemList) {
		itemList.forEach((item) => {
			if (item.icon && !/^\w+:\/\//.test(item.icon)) {
				item.icon = "file://" + files.path(item.icon);
			}
		});
		ui.itemList.setDataSource(itemList);
		ui.load.hide();
	}

	global.activity.setSupportActionBar(ui.toolbar);
	if (itemList.then) {
		// const Animation = android.view.animation.Animation;
		const ValueAnimator = android.animation.ValueAnimator;
		const LinearInterpolator = android.view.animation.LinearInterpolator;
		const ObjectAnimator = android.animation.ObjectAnimator;

		const objectAnimator = ObjectAnimator.ofFloat(ui.load, "rotation", 0, 359);
		objectAnimator.setRepeatCount(ValueAnimator.INFINITE);
		objectAnimator.setDuration(2000);
		objectAnimator.setInterpolator(new LinearInterpolator());
		objectAnimator.start();
		const lazyResult = threads.disposable();
		threads.start(function () {
			itemList.then(itemList => {
				lazyResult.setAndNotify(itemList);
			});
		});
		setTimeout(() => {
			setDataSource(lazyResult.blockedGet());
		}, 0x200);
	} else {
		setDataSource(itemList);
	}
}

module.exports = singleChoice;
