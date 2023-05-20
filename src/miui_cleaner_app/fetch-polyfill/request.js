const {
	initBody,
	Body,
} = require("./body");

class Request extends Body {
	constructor (input, options = {}) {
		super();
		if (!(this instanceof Request)) {
			throw new TypeError("Please use the \"new\" operator, this DOM object constructor cannot be called as a function.");
		}

		let body = options.body;

		if (input instanceof Request) {
			if (input.bodyUsed) {
				throw new TypeError("Already read");
			}
			this.#url = input.url;
			this.#credentials = input.credentials;
			if (!options.headers) {
				this.#headers = new Headers(input.headers);
			}
			this.#method = input.method;
			this.#mode = input.mode;
			this.#signal = input.signal;
			if (!body && input._bodyInit != null) {
				body = input._bodyInit;
				input.bodyUsed = true;
			}
		} else {
			this.#url = input;
		}

		// this.#body = options.body;
		this.#cache = options.cache;
		this.#credentials = options.credentials;
		this.#destination = options.destination;
		this.#headers = new Headers(options.headers);
		this.#integrity = options.integrity;
		this.#method = options.method;
		this.#mode = options.mode;
		this.#redirect = options.redirect;
		this.#referrerPolicy = options.referrerPolicy;
		this.#signal = options.signal;
		this.#method = options.method;
		initBody(this, body);
	}

	#referrerPolicy = "";
	#credentials = "same-origin";
	#referrer = "about:client";
	#redirect = "follow";
	#method = "GET";
	#url = "";
	#destination;
	#signal;
	#headers;
	#cache;
	#mode;
	#integrity;
	get url () {
		let url = String(this.#url);
		if (!/^\w+:\/\//.test(url)) {
			url = "https://" + url;
		}
		return url;
	}

	get method () {
		const method = this.#method || "GET";
		const upcased = method.toUpperCase();
		return ["DELETE", "GET", "HEAD", "OPTIONS", "POST", "PUT"].includes(upcased) ? upcased : method;
	}

	get headers () {
		const headers = this.#headers;
		// HTTP-network-or-cache fetch step 2.11
		if (!headers.has("User-Agent")) {
			headers.set("User-Agent", "node-fetch");
		}
		if (!headers.has("Accept")) {
			headers.set("Accept", "*/*");
		}
		return headers;
	}

	cache () {
		return this.#cache;
	}

	credentials () {
		return this.#credentials;
	}

	destination () {
		return this.#destination;
	}

	integrity () {
		return this.#integrity;
	}

	mode () {
		return this.#mode;
	}

	redirect () {
		return this.#redirect;
	}

	referrer () {
		return this.#referrer;
	}

	referrerPolicy () {
		return this.#referrerPolicy;
	}

	signal () {
		return this.#signal;
	}

	clone () {
		return new Request(this);
	};
}

module.exports = {
	Request,
};
