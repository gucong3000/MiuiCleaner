const project = require("./project.json");
function singleChoice (
	{
		itemList,
		title,
		icon = "@drawable/ic_launcher",
		fn = null,
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
						</horizontal>
					</card>
				</list>
			</vertical>
			<fab id="load" w="auto" h="auto" src="@drawable/ic_check_for_updates" layout_gravity="center|center" tint="#ffffff" />
		</frame>
	`);

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

	function setDataSource (itemList) {
		ui.load.hide();
		ui.itemList.setDataSource(itemList);
	}

	ui.itemList.on("item_click", function (item, i, itemView, listView) {
		item.fn ? item.fn(item) : fn(item);
	});
}

module.exports = singleChoice;
