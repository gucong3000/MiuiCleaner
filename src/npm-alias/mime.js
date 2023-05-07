let mime;

function init () {
	mime = mime || android.webkit.MimeTypeMap.getSingleton();
}

module.exports = {
	getExtension: (mimeType) => init().getExtensionFromMimeType(mimeType),
	getType: (extension) => init().getMimeTypeFromExtension(extension),
};
