require("core-js/modules/es.promise.any");

function request (url, options) {
	if (Array.isArray(url)) {
		return Promise.any(url.map(url => request(url, options)));
	}
	return new Promise((resolve, reject) => {
		http.request(url, {
			method: "GET",
			...options,
		}, (res) => {
			if (res.statusCode >= 200 && res.statusCode < 300) {
				ui.run(() => {
					resolve(res);
				});
			} else {
				reject(res);
			}
		});
	});
}

function getJson (url, options) {
	return request(url, {
		contentType: "application/json",
		...options,
	}).then(res => {
		return res.body.json();
	});
}

request.getJson = getJson;
module.exports = request;
