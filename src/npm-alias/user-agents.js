let userAgent;

function init () {
	if (!userAgent) {
		userAgent = android.webkit.WebSettings.getDefaultUserAgent(context);
	}
	return userAgent;
}
class UserAgent {
	[Symbol.toPrimitive] = init;
	toString = init;
}

module.exports = UserAgent;
