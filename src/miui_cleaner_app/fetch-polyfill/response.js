// https://square.github.io/okhttp/4.x/okhttp/okhttp3/-response/
// https://developer.mozilla.org/zh-CN/docs/Web/API/Response

const INTERNALS = Symbol("Response internals");
const body = require("./body");

class Response extends body.Body {
	constructor (bodyInit, options) {
		super();
		if (!(this instanceof Response)) {
			throw new TypeError("Please use the \"new\" operator, this DOM object constructor cannot be called as a function.");
		}
		if (options) {
			this.#status = options.status == null ? 200 : options.status;
			this.#statusText = options.statusText == null ? "" : String(options.statusText);
			this.#headers = new Headers(options.headers);
			this.#url = options.url || "";
		}
		if (bodyInit) {
			body.initBody(this, bodyInit);
		}
	}

	#type = "default";
	#headers;
	#statusText = "";
	#status = 200;
	#url = "";

	get headers () {
		if (!this.#headers) {
			this.#headers = new Headers();
			this[INTERNALS].headers().forEach(entry => {
				this.#headers.append(entry.first, entry.second);
			});
		}
		return this.#headers;
	}

	get ok () {
		return this.status >= 200 && this.status < 300;
	}

	get redirected () {
		return this[INTERNALS] ? this[INTERNALS].isRedirect() : (this.status >= 300 && this.status < 400);
	}

	get status () {
		return this[INTERNALS] ? this[INTERNALS].code() : this.#status;
	}

	get statusText () {
		return this[INTERNALS] ? this[INTERNALS].message() : this.#statusText;
	}

	get type () {
		// TODO
		return this.#type;
	}

	get url () {
		return this[INTERNALS] ? this[INTERNALS].request().url().toString() : this.#url;
	}

	clone () {
		// TODO
		// return wrap(this[INTERNALS]);
	}

	static error (...args) {
		// TODO
	}

	static redirect () {
		// TODO
	}
}

Object.defineProperties(Response.prototype, {
	type: { enumerable: true },
	url: { enumerable: true },
	status: { enumerable: true },
	ok: { enumerable: true },
	redirected: { enumerable: true },
	statusText: { enumerable: true },
	headers: { enumerable: true },
	clone: { enumerable: true },
});

function wrap (okhttpResponse, okhttpBody, response) {
	response = response || new Response();
	response[INTERNALS] = okhttpResponse;
	body.wrap(okhttpBody, response);
	return response;
}

module.exports = {
	INTERNALS,
	Response,
	wrap,
};
