const packageName = context.getPackageName();
const find = () => selector().packageName(packageName).findOnce();
module.exports = (period) => {
	period = period || 0x200;
	do {
		sleep(period);
	} while (find());
	do {
		sleep(period);
	} while (!find());
};
