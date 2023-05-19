// https://square.github.io/okhttp/4.x/okhttp/okhttp3/-headers/
// https://developer.mozilla.org/zh-CN/docs/Web/API/Headers

const HEADERS_INVALID_CHARACTERS = /[^a-z0-9\-#$%&'*+.^_`|~]/i;
function normalizeHeaderName (name) {
	if (typeof name !== "string") {
		name = String(name);
	}

	if (HEADERS_INVALID_CHARACTERS.test(name) || name.trim() === "") {
		throw new TypeError("Invalid character in header field name");
	}

	return name.toLowerCase();
}

function normalizeHeaderValue (value) {
	if (typeof value !== "string") {
		value = String(value);
	}

	return value;
}

class Headers extends (global.Headers || null) {
	#value = new Map();
	constructor (init) {
		super();
		if (init) {
			for (let [name, value] of init) {
				if (name === "set-cookie") {
					if (init.getSetCookie) {
						if (this.has(name)) {
							continue;
						} else {
							value = init.getSetCookie();
						}
					} else {
						value = value.split(/,\s*(?=\S+=)/);
					}
					value.forEach(value => this.append(name, value));
				} else {
					this.append(name, value);
				}
			}
		}
	}

	append (name, value) {
		name = normalizeHeaderName(name);
		value = normalizeHeaderValue(value);
		const valueList = this.#value.get(name) || [];
		valueList.push(value);
		this.#value.set(name, valueList);
	}

	delete (name) {
		return this.#value.delete(normalizeHeaderName(name));
	}

	* entries () {
		for (const name of this.#value.keys()) {
			const value = this.get(name);
			if (value != null) {
				yield [name, value];
			}
		}
	}

	forEach (callback, thisArg) {
		for (const name of this.keys()) {
			Reflect.apply(callback, thisArg, [this.get(name), name, this]);
		}
	}

	get (name) {
		name = normalizeHeaderName(name);
		let values = this.#value.get(name);
		if (values && values.length) {
			values = values.join(", ");
			if (/^content-encoding$/i.test(name)) {
				values = values.toLowerCase();
			}
		} else {
			values = null;
		}
		return values;
	}

	getSetCookie () {
		return this.#value.get("set-cookie") || [];
	}

	has (name) {
		return this.get(name) != null;
	}

	* keys () {
		for (const [key] of this.entries()) {
			yield key;
		}
	}

	set (name, value) {
		this.#value.set(normalizeHeaderName(name), [normalizeHeaderValue(value)]);
	}

	* values () {
		for (const name of this.keys()) {
			yield this.get(name);
		}
	}

	[Symbol.iterator] () {
		return this.entries();
	}
}

function wrap (okhttpHeaders) {
	const headers = new Headers();
	okhttpHeaders.forEach(entry => {
		headers.append(entry.first, entry.second);
	});
	return headers;
}

module.exports = {
	Headers,
	wrap,
};
