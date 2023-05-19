const INTERNALS = Symbol("Body internals");
function readArrayBufferAsText (buf) {
	const view = new Uint8Array(buf);
	const chars = new Array(view.length);

	for (let i = 0; i < view.length; i++) {
		chars[i] = String.fromCharCode(view[i]);
	}
	return chars.join("");
}

function bufferClone (buf) {
	if (buf.slice) {
		return buf.slice(0);
	} else {
		const view = new Uint8Array(buf.byteLength);
		view.set(new Uint8Array(buf));
		return view.buffer;
	}
}

class Body {
	[INTERNALS] = {};
	#bodyUsed = false;
	get bodyUsed () {
		return this.#bodyUsed;
	}

	async #raw () {
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
					controller.enqueue(await this.arrayBuffer());
					controller.close();
				},
			});
		}
		return this.#body;
	}

	async blob () {
		const raw = await this.#raw();
		if (raw.blob) {
			return raw.blob;
		} else if (raw.arrayBuffer) {
			return new Blob([raw.arrayBuffer]);
		} else if (raw.formData) {
			throw new TypeError(`${this.constructor.name}.blob: could not read FormData body as blob`);
		} else {
			return new Blob([
				new Uint8Array(Array.from(raw.text).map(char => char.charCodeAt(0))),
			]);
		}
	};

	async arrayBuffer () {
		if (this[INTERNALS].arrayBuffer) {
			const raw = await this.#raw();
			if (ArrayBuffer.isView(raw.arrayBuffer)) {
				return raw.arrayBuffer.buffer.slice(
					raw.arrayBuffer.byteOffset,
					raw.arrayBuffer.byteOffset + raw.arrayBuffer.byteLength,
				);
			} else {
				return raw.arrayBuffer;
			}
		} else {
			const blob = await this.blob();
			return blob.arrayBuffer();
		}
	};

	async text () {
		const raw = await this.#raw();
		if (raw.blob) {
			return raw.blob.text();
		} else if (raw.arrayBuffer) {
			return readArrayBufferAsText(raw.arrayBuffer);
		} else if (raw.formData) {
			throw new TypeError(`${this.constructor.name}.blob: could not read FormData body as text`);
		} else {
			return raw.text;
		}
	};

	async formData () {
		return decode(
			await this.text(),
		);
	};

	async json () {
		return JSON.parse(
			await this.text(),
		);
	};
}

function decode (body) {
	const form = new FormData();
	body
		.trim()
		.split("&")
		.forEach(function (bytes) {
			if (bytes) {
				const split = bytes.split("=");
				const name = split.shift().replace(/\+/g, " ");
				const value = split.join("=").replace(/\+/g, " ");
				form.append(decodeURIComponent(name), decodeURIComponent(value));
			}
		});
	return form;
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
		raw.text = init.toString();
	} else if (init instanceof DataView) {
		raw.arrayBuffer = bufferClone(init.buffer);
	} else if (ArrayBuffer.isView(init)) {
		raw.arrayBuffer = bufferClone(init);
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

module.exports = {
	initBody,
	Body,
};
