module.exports = {
	env: {
		browser: true,
		commonjs: true,
		es6: true,
		node: true,
	},
	extends: [
		"plugin:react/recommended",
		"standard",
	],
	parserOptions: {
		ecmaFeatures: {
			jsx: true,
		},
		ecmaVersion: 2018,
	},
	plugins: [
		"react",
	],
	globals: {
		Atomics: "readonly",
		SharedArrayBuffer: "readonly",
		colors: true,
		com: true,
		importClass: true,
		storages: true,
		device: true,
		log: true,
		threads: true,
		exit: true,
		runtime: true,
		java: true,
		importPackage: true,
		YuvImage: true,
		ImageFormat: true,
		ui: true,
		activity: true,
		View: true,
		context: true,
		ObjectAnimator: true,
		BinaryBitmap: true,
		HybridBinarizer: true,
		RGBLuminanceSource: true,
		MultiFormatReader: true,
		sleep: true,
		util: true,
		android: true,
		Paint: true,
		PorterDuffXfermode: true,
		PorterDuff: true,
		toastLog: true,
		ByteArrayOutputStream: true,
		Rect: true,
		ActivityCompat: true,
		files: true,
		requestScreenCapture: true,
		http: true,
		toast: true,
		engines: true,
		random: true,
		events: true,
		press: true,
		Tap: true,
		gesture: true,
		Swipe: true,
		getPackageName: true,
		shell: true,
		floaty: true,
		currentPackage: true,
		Canvas: true,
		launch: true,
		FileOutputStream: true,
		app: true,
		images: true,
		launchApp: true,
		Bitmap: true,
		className: true,
		Buffer: true,
		idEndsWith: true,
		textEndsWith: true,
		descEndsWith: true,
		text: true,
		back: true,
		textMatches: true,
		textStartsWith: true,
		id: true,
		desc: true,
		descStartsWith: true,
		AnimatorSet: true,
		click: true,
		PendingIntent: true,
		dialogs: true,
		auto: true,
		Settings: true,
		setClip: true,
		Context: true,
		getClip: true,
		DevicePolicyManager: true,
		Intent: true,
		ComponentName: true,
		Cipher: true,
		IvParameterSpec: true,
		SecretKeySpec: true,
		javax: true,
		BASE64Decoder: true,
		NotificationManager: true,
		NotificationChannel: true,
		Uri: true,
		media: true,
		ServerSocket: true,
		DataInputStream: true,
		DataOutputStream: true,
		Socket: true,
		JavaAdapter: true,
		WebChromeClient: true,
		ValueCallback: true,
		captureScreen: true,
		timers: true,
		selector: true,
		recents: true,
		swipe: true,
		waitForActivity: true,
		waitForPackage: true,
		currentActivity: true,
	},
	rules: {
		"indent": ["error", "tab"],
		"quotes": ["error", "double"],
		"semi": ["error", "always"],
		"block-spacing": ["error", "always"],
		"array-bracket-spacing": ["error", "never"],
		"quote-props": ["error", "consistent-as-needed"],
		"comma-dangle": ["error", "always-multiline"],
		"no-tabs": ["off"],
	},
};
