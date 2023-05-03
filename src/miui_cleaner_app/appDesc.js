
// https://gist.github.com/mcxiaoke/0a4c639d04e94c45eb6c787c0f98940a
// https://fengooge.blogspot.com/2019/03/taking-ADB-to-uninstall-system-applications-in-MIUI-without-root.html

module.exports = {
	// APP 外置开屏广告
	"com.miui.analytics": "广告分析",
	"com.miui.systemAdSolution": "小米广告联盟∑的开屏广告",
	// 桌面广告 APP
	"com.miui.personalassistant": "负一屏",
	"com.mi.android.globalminusscreen": "负一屏",
	"com.miui.smarttravel": "智能出行",
	"com.miui.newhome": "趣看看",
	"com.android.quicksearchbox": "桌面搜索框/搜索/全局搜索",
	"com.google.android.googlequicksearchbox": "桌面搜索框（Google）",
	"com.baidu.searchbox": "桌面搜索框（百度）",
	// 过时的 APP
	"com.miui.touchassistant": "悬浮球/Quickball",
	"com.miui.hybrid.accessory": "古早版智能家居",
	"com.android.midrive": "古早版小米云盘",
	// 无障碍辅助
	"com.miui.accessibility": "小米闻声/听障辅助工具/语音转文字",
	"com.google.android.marvin.talkback": "TalkBack/视障辅助工具/文字转语音",
	// 影音类 APP
	"com.miui.player": "QQ音乐简洁版，应替换成ES文件浏览器",
	"com.miui.videoplayer": "Mi Video，应替换成ES文件浏览器",
	"com.miui.video": "小米视频，应替换成ES文件浏览器",
	"com.tencent.qqlivexiaomi": "小米视频插件-腾讯视频小米版",
	"com.qiyi.video.sdkplayer": "小米视频插件-爱奇艺播放器",
	// 天气
	"com.miui.weather2": "小米天气，应替换成Holi天气",
	// 支付、电商、理财类 APP
	"com.xiaomi.shop": "小米商城",
	"com.xiaomi.ab": "小米商城系统组件/电商助手",
	"com.mipay.wallet": "小米钱包",
	"com.xiaomi.payment": "米币支付",
	"com.miui.nextpay": "小米支付",
	"com.xiaomi.pass": "小米卡包",
	"com.xiaomi.jr": "小米金融/天星金融",
	"com.xiaomi.jr.security": "小米金融/天星金融-安全组件",
	"com.xiaomi.mifisecurity": "小米金服安全组件",
	"com.unionpay.tsmservice.mi": "银联可信服务安全组件小米版",
	// 低使用频率 APP
	"com.miui.huanji": "小米换机",
	"com.xiaomi.vipaccount": "小米社区",
	"com.miui.bugreport": "bug反馈",
	"com.miui.klo.bugreport": "KLO bug反馈",
	"com.miui.miservice": "服务与反馈",
	"com.miui.vipservice": "我的服务",
	"com.mfashiongallery.emag": "小米画报",
	"com.android.wallpaper": "动态壁纸",
	"com.android.wallpaper.livepicker": "动态壁纸获取",
	"com.android.wallpaperbackup": "壁纸备份",
	"com.android.wallpapercropper": "壁纸编辑器",
	"com.miui.fm": "收音机/蜻蜓FM",
	"cn.wps.moffice_eng.xiaomi.lite": "WPS Office Lite",
	"com.dragon.read": "阅读/番茄免费小说",
	"com.duokan.reader": "阅读/多看阅读器",
	"com.mi.health": "小米健康/小米运动健康",
	// 浏览器
	"com.android.browser": "小米浏览器",
	"com.mi.globalbrowser": "小米浏览器（国际版）",
	"com.android.chrome": "Chrome",
	// 内置输入法
	"com.baidu.input_mi": "百度输入法-小米版",
	"com.sohu.inputmethod.sogou.xiaomi": "搜狗输入法-小米版",
	"com.iflytek.inputmethod.miui": "讯飞输入法-小米版",
	"com.miui.securityinputmethod": "小米安全键盘",
	// 小米游戏中心
	"com.xiaomi.migameservice": "游戏中心（旧版）",
	"com.xiaomi.gamecenter": "游戏中心",
	"com.xiaomi.gamecenter.sdk.service": "游戏中心-SDK服务",
	"com.xiaomi.gamecenter.pad": "游戏中心-pad版",
	"com.xiaomi.joyose": "云控/温控/记步",
	// SIM 卡应用
	"com.miui.virtualsim": "全球上网",
	"com.xiaomi.mimobile": "小米移动",
	"com.xiaomi.mimobile.cloudsim": "小米移动-小米云流量",
	"com.xiaomi.mimobile.noti": "小米移动-全球上网-插件",
	"com.android.stk": "SIM卡应用",
	// 快应用
	"com.miui.quickappCenter.miAppStore": "快应用中心/快应用商店",
	"com.miui.hybrid": "快应用服务框架",
	// 语音助手
	"com.miui.voiceassist": "小爱语音/小爱同学",
	"com.miui.voicetrigger": "语音唤醒语音助手",
	"com.xiaomi.scanner": "小爱视觉/扫一扫",
	"com.xiaomi.aiasst.vision": "小爱翻译",
	"com.xiaomi.aiasst.service": "小爱通话（AI虚拟助手）",
	// TTS引擎
	// https://blog.csdn.net/yingchengyou/article/details/79591954
	"com.xiaomi.mibrain.speech": "小米TTS",
	"com.svox.pico": "Svox TTS",
	"com.svox.classic": "Svox TTS",
	"com.google.android.tts": "Google TTS",
	"com.iflytek.speechcloud": "科大讯飞TTS",
	"com.iflytek.speechsuite": "科大讯飞TTS",
	"com.iflytek.tts": "科大讯飞TTS",
	"com.baidu.duersdk.opensdk": "度秘TTS",
	// 翻译
	"com.miui.translationservice": "MIUI翻译服务",
	"com.miui.translation.xmcloud": "MIUI翻译-小米云",
	"com.miui.translation.kingsoft": "MIUI翻译-金山",
	"com.miui.translation.youdao": "MIUI翻译-有道",
};
