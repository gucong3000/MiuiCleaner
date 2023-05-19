// https://square.github.io/okhttp/4.x/okhttp/okhttp3/-request-body/
// https://square.github.io/okhttp/4.x/okhttp/okhttp3/-response-body/
// https://developer.mozilla.org/zh-CN/docs/Web/API/Body

const INTERNALS = Symbol("Body internals");

class Body extends (global.Body || null) {
	#bodyUsed = false;
	async #getOkhttpBody () {
		if (this.#bodyUsed) {
			throw new TypeError(`Failed to execute function on '${this.constructor.name}': body stream already read`);
		} else {
			this.#bodyUsed = true;
			return this[INTERNALS];
		}
	}

	#body;
	get body () {
		if (!this.#body) {
			this.#body = new ReadableStream({
				async start (controller) {
					const {
						bytes,
					} = await this.#getOkhttpBody();
					controller.enqueue(new Uint8Array(Array.from(bytes)));
					controller.close();
				},
			});
		}
		return this.#body;
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
		throw new TypeError(`${this.constructor.name}.formData: Could not parse content as FormData`);
	}

	/**
	 * Return raw response as Blob
	 *
	 * @return Promise
	 */
	async blob () {
		const {
			bytes,
			contentType,
		} = await this.#getOkhttpBody();
		return new Blob(
			[
				new Uint8Array(Array.from(bytes)),
			],
			{
				type: `${contentType.type()}/${contentType.subtype()}`,
			},
		);
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

	/**
	 * Decode response as text
	 *
	 * @return  Promise
	 */
	async text () {
		const {
			bytes,
			contentType,
		} = await this.#getOkhttpBody();
		return new java.lang.String(
			bytes,
			contentType.charset() || "UTF-8",
		);
	}
}

function wrap (okhttpBody, body) {
	body = body || new Body();
	body[INTERNALS] = okhttpBody;
	return body;
}

module.exports = {
	INTERNALS,
	Body,
	wrap,
};
