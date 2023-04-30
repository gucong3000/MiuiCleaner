// https://github.com/mozilla/rhino/issues/224

//
// Date.fromString("2020-10-15");

Date.parse("2023-01-03 09:59:38") || (() => {
	const $Date = global.Date;
	const propNames = Object.getOwnPropertyNames($Date);
	const DateShim = function Date (...args) {
		if (typeof args[0] === "string") {
			// global.Date = $Date;
			args[0] = parser.fromString(args[0]).toString();
			// global.Date = DateConstructor;
		}
		let date;
		if (this instanceof $Date) {
			date = new $Date(...args);
		} else {
			date = $Date(...args);
		}
		if (date) {
			Object.defineProperties(date, {
				constructor: {
					value: DateShim,
				},
			});
		}
		return date;
	};
	global.Date = DateShim;
	require("intl");
	require("any-date-parser");
	const parser = require("any-date-parser");

	propNames.forEach(propertyName => {
		try {
			DateShim[propertyName] = $Date[propertyName];
		} catch (ex) {
			//
		}
	});

	Date.parse = function parse (dateString) {
		return parser.fromString(dateString).getTime();
	};
})();
