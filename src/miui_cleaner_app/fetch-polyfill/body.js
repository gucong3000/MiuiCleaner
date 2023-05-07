// https://square.github.io/okhttp/4.x/okhttp/okhttp3/-request-body/
// https://square.github.io/okhttp/4.x/okhttp/okhttp3/-response-body/
// https://developer.mozilla.org/zh-CN/docs/Web/API/Body

const Blob = global.Blob || require("blob-polyfill").Blob;
const INTERNALS = Symbol("Body internals");

function hexToArrayUint8Array (input) {
	const view = new Uint8Array(input.length / 2);
	for (let i = 0; i < input.length; i += 2) {
		view[i / 2] = parseInt(input.substring(i, i + 2), 16);
	}
	return view;
}

class Body extends (global.Body || null) {
	#bodyUsed = false;
	get #byteString () {
		if (this.#bodyUsed) {
			throw new TypeError(`Failed to execute function on '${this.constructor.name}': body stream already read`);
		} else {
			this.#bodyUsed = true;
			return this[INTERNALS].byteString();
		}
	}

	get #blob () {
		const contentType = this[INTERNALS].contentType();
		return new Blob([
			hexToArrayUint8Array(this.#byteString.hex()),
		], {
			type: `${contentType.type()}/${contentType.subtype()}`,
		});
	}

	get body () {
		this.#blob.stream();
	}

	get bodyUsed () {
		return this.#bodyUsed;
	}

	/**
	 * Decode response as ArrayBuffer
	 *
	 * @return  Promise
	 */
	async arrayBuffer () {
		const blob = await this.blob();
		return blob.arrayBuffer();
	}

	async formData () {
		// TODO
	}

	/**
	 * Return raw response as Blob
	 *
	 * @return Promise
	 */
	async blob () {
		return this.#blob;
	}

	/**
	 * Decode response as json
	 *
	 * @return  Promise
	 */
	async json () {
		const text = await this.text();
		return JSON.parse(text);
	}

	#text;
	/**
	 * Decode response as text
	 *
	 * @return  Promise
	 */
	async text () {
		return new java.lang.String(
			this.#byteString.toByteArray(),
			this[INTERNALS].contentType().charset() || "UTF-8",
		);
	}
}

function wrap (okhttpBody, body) {
	body = body || new Body();
	body[INTERNALS] = okhttpBody;
	return okhttpBody;
}

module.exports = {
	INTERNALS,
	Body,
	wrap,
};
