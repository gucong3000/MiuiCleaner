// https://square.github.io/okhttp/4.x/okhttp/okhttp3/-response/
// https://developer.mozilla.org/zh-CN/docs/Web/API/Response

const INTERNALS = Symbol("Response internals");
const body = require("./body");
const headers = require("./headers");

class Response extends body.Body {
	#headers;
	get headers () {
		if (!this.#headers) {
			this.#headers = headers.wrap(this[INTERNALS].headers());
		}
		return this.#headers;
	}

	get ok () {
		return this.status >= 200 && this.status < 300;
	}

	get redirected () {
		return this[INTERNALS].isRedirect();
	}

	get status () {
		return this[INTERNALS].code();
	}

	get statusText () {
		return this[INTERNALS].message();
	}

	get type () {
		// TODO
	}

	get url () {
		return this[INTERNALS].request().url().toString();
	}

	clone () {
		return wrap(this[INTERNALS]);
	}

	static error (...args) {
		// TODO
	}

	static redirect () {
		// TODO
	}
}

function wrap (okhttpResponse, response) {
	response = response || new Response();
	response[INTERNALS] = okhttpResponse;
	body.wrap(okhttpResponse.body(), response);
	return response;
}

module.exports = {
	INTERNALS,
	Response,
	wrap,
};
