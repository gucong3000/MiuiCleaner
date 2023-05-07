let userAgent;

function init () {
	userAgent = userAgent || android.webkit.WebSettings.getDefaultUserAgent(context);
}
class UserAgent {
	[Symbol.toPrimitive] = init;
	toString = init;
}

module.exports = UserAgent;
