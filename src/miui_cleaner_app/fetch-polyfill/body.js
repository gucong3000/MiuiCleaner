// https://square.github.io/okhttp/4.x/okhttp/okhttp3/-request-body/
// https://square.github.io/okhttp/4.x/okhttp/okhttp3/-response-body/
// https://developer.mozilla.org/zh-CN/docs/Web/API/Body

const INTERNALS = Symbol("Body internals");

function formDataToBlob (formData) {
	const formDataToBlob = require("./utils/formdata-to-blob");
	return formDataToBlob(formData);
}
class Body extends (global.Body || null) {
	[INTERNALS] = {};

	#body;
	get body () {
		if (!this.#body) {
			const getDataView = this.#getDataView.bind(this);
			this.#body = new ReadableStream({
				async start (controller) {
					const arrayBuffer = await this.#findArrayBuffer("arrayBuffer");
					controller.enqueue(
						arrayBuffer
							? new Uint8Array(arrayBuffer)
							: await getDataView(),
					);
					controller.close();
				},
			});
		}
		return this.#body;
	}

	#bodyUsed = false;
	get bodyUsed () {
		return this.#bodyUsed;
	}

	#getRawBody (functionName) {
		if (functionName && this.#bodyUsed) {
			throw new TypeError(`Failed to execute '${functionName}' on '${this.constructor.name}': body stream already read`);
		} else {
			this.#bodyUsed = true;
			return this[INTERNALS];
		}
	}

	async #getDataView (functionName) {
		const raw = await this.#getRawBody(functionName);
		let bytes;
		let text;

		if (raw.text != null) {
			text = raw.text;
		} else if (raw.bytes) {
			bytes = raw.bytes;
		} else if (raw.search) {
			text = raw.search.toString();
		}

		if (text) {
			if (!text.getBytes) {
				text = new java.lang.String(text);
			}
			bytes = text.getBytes();
		}
		if (bytes) {
			const view = new Uint8Array(bytes.length);
			for (let index = 0; index < bytes.length; index++) {
				view[index] = bytes[index];
			}
			return view;
		}
	}

	async #findArrayBuffer (functionName) {
		const raw = await this.#getRawBody(functionName);
		let arrayBuffer;
		if (raw.arrayBuffer) {
			arrayBuffer = raw.arrayBuffer;
		} else if (raw.blob) {
			arrayBuffer = raw.blob.arrayBuffer();
		} else if (raw.formData) {
			arrayBuffer = formDataToBlob(raw.formData).arrayBuffer();
		}
		return await arrayBuffer;
	}

	/**
	 * Decode response as ArrayBuffer
	 *
	 * @return  Promise
	 */
	async arrayBuffer () {
		return (await this.#findArrayBuffer("arrayBuffer")) || (await this.#getDataView(null)).buffer;
	}

	/**
	 * Return raw response as Blob
	 *
	 * @return Promise
	 */
	async blob () {
		const raw = await this.#getRawBody("blob");
		let blob;
		if (raw.blob) {
			blob = raw.blob;
		} else if (raw.formData) {
			blob = formDataToBlob(raw.formData);
		} else {
			if (raw.arrayBuffer) {
				blob = raw.arrayBuffer;
			} else {
				blob = await this.#getDataView(null);
			}
			blob = new Blob(
				[
					blob,
				],
				{
					type: raw.type,
				},
			);
		}
		return await blob;
	}

	/**
	 * Decode response as text
	 *
	 * @return  Promise
	 */
	async #getText (functionName) {
		const raw = await this.#getRawBody(functionName);
		let text;
		if (raw.text != null) {
			text = raw.text;
		} else if (raw.bytes) {
			text = new java.lang.String(raw.bytes);
		} else if (raw.blob) {
			text = raw.blob.text();
		} else if (raw.search) {
			text = raw.search.toString();
		} else if (raw.arrayBuffer) {
			const view = new Uint8Array(raw.arrayBuffer);
			const chars = new Array(view.length);
			for (let i = 0; i < view.length; i++) {
				chars[i] = String.fromCharCode(view[i]);
			}
			return chars.join("");
		} else if (raw.formData) {
			text = formDataToBlob(raw.formData).text();
		}

		return await text;
	}

	/**
	 * Decode response as text
	 *
	 * @return  Promise
	 */
	text () {
		return this.#getText("text");
	}

	/**
	 * Decode response as json
	 *
	 * @return  Promise
	 */
	async json () {
		return JSON.parse(
			await this.#getText("json"),
		);
	}

	async formData () {
		const raw = await this.#getRawBody("formData");
		let formData;
		if (raw.formData) {
			formData = raw.formData;
		} else {
			const body = await this.#getText(null);
			formData = new FormData();
			body.trim().split("&").forEach(function (bytes) {
				if (bytes) {
					const split = bytes.split("=");
					const name = split.shift().replace(/\+/g, " ");
					const value = split.join("=").replace(/\+/g, " ");
					formData.append(decodeURIComponent(name), decodeURIComponent(value));
				}
			});
		}

		return await formData;
	}
}

function initBody (body, init) {
	const raw = body[INTERNALS] = {};
	if (!init) {
		raw.text = "";
	} else if (typeof init === "string") {
		raw.text = init;
	} else if (init instanceof Blob) {
		raw.blob = init;
	} else if (init instanceof FormData) {
		raw.formData = init;
	} else if (init instanceof URLSearchParams) {
		raw.search = init;
	} else if (init instanceof DataView) {
		raw.arrayBuffer = init.buffer;
	} else if (ArrayBuffer.isView(init)) {
		raw.arrayBuffer = init;
	} else {
		raw.text = init = Object.prototype.toString.call(init);
	}

	if (!body.headers.get("content-type")) {
		if (typeof init === "string") {
			body.headers.set("content-type", "text/plain;charset=UTF-8");
		} else if (raw.blob && raw.blob.type) {
			body.headers.set("content-type", raw.blob.type);
		} else if (init instanceof URLSearchParams) {
			body.headers.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8");
		}
	}
};

function wrap (okhttpBody, body) {
	body = body || new Body();
	body[INTERNALS] = okhttpBody;
	return body;
}

module.exports = {
	INTERNALS,
	initBody,
	Body,
	wrap,
};
