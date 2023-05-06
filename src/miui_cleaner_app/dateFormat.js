// https://github.com/mozilla/rhino/issues/224

Date.parse("2023-01-03 09:59:38") || (() => {
	const $Date = global.Date;
	const DateShim = function Date (...args) {
		if (typeof args[0] === "string") {
			// global.Date = $Date;
			try {
				args[0] = parser.fromString(args[0]).toString();
			} catch (ex) {
				//
			}
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

	Object.getOwnPropertyNames($Date).forEach(propertyName => {
		try {
			DateShim[propertyName] = $Date[propertyName];
		} catch (ex) {
			//
		}
	});

	DateShim.parse = function parse (dateString) {
		try {
			return parser.fromString(dateString).getTime();
		} catch (ex) {
			return $Date.parse(dateString);
		}
	};
	require("intl");
	const parser = require("any-date-parser");
})();
