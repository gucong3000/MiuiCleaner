@echo off
chcp 65001>nul 2>nul
title MiuiCleaner - MIUI广告清理工具 - v2022.9.27.6

:start
adb shell pm list packages>"%temp%\adb_list_packages.tmp" 2>&1
if %errorlevel%==1 (
	findstr /c:"no devices" "%temp%\adb_list_packages.tmp">nul 2>nul && (
		echo · 请确保已用数据线连接手机和电脑
		echo · 请确保小米手机助手可正常连接手机
		echo · 请确保已请确保USB调试模式已打开
	) || findstr /c:"unauthorized" "%temp%\adb_list_packages.tmp">nul 2>nul && (
		echo · 请在手机弹出授权提示时点击“确定”
	) || (
		type "%temp%\adb_list_packages.tmp"
	)
	echo.
	echo 请在排除故障后按任意键重试
	pause>nul 2>nul
	goto:start
) else if %errorlevel% geq 1 (
	echo 错误：请将本程序移动到小米手机助手安装目录内再运行，按任意键前往小米手机助手官网
	pause>nul 2>nul
	start http://zhushou.xiaomi.com/
	goto:eof
)

call:pkg_exist "com.github.gucong3000.miui.cleaner" || (
	if exist "MiuiCleaner.apk" (
		echo 正在手机上安装 MiuiCleaner.apk, 请打开“设置 → 更多设置 → 开发者选项 → USB安装”
		call:apk_install
	) else (
		echo 未在手机上找到“MiuiCleaner”，请将“MiuiCleaner.apk”拷贝至"%CD%"文件夹，或直接安装在手机后，按任意键重试
		pause>nul 2>nul
		goto:start
	)
)

del /f /s /q "%temp%\adb_list_packages.tmp">nul 2>nul

@REM adb shell settings put global passport_ad_status OFF
adb shell settings put secure install_non_market_apps 1
@REM adb shell settings get secure enabled_accessibility_services

adb shell pm grant com.github.gucong3000.miui.cleaner android.permission.WRITE_SETTINGS>nul 2>nul
adb shell pm grant com.github.gucong3000.miui.cleaner android.permission.WRITE_SECURE_SETTINGS>nul 2>nul
adb shell pm grant com.github.gucong3000.miui.cleaner android.permission.SYSTEM_ALERT_WINDOW>nul 2>nul

echo 请在手机上打开“MiuiCleaner”，并在“无障碍”设置页面弹出时，打开“已下载的服务”，找到“MiuiCleaner”，开启它提供的的无障碍服务
echo 正等候手机端发出指令...

goto:adb_server

:pkg_exist
    findstr /b /e /c:"package:%~1" "%temp%\adb_list_packages.tmp">nul 2>nul
goto:eof

:apk_install
	adb install -t -r -g MiuiCleaner.apk>nul 2>nul || (timeout /t 1>nul 2>nul && goto:apk_install)
	adb shell am start -n com.github.gucong3000.miui.cleaner/com.stardust.auojs.inrt.SplashActivity>nul 2>nul
goto:eof

:adb_server
	adb shell sh /sdcard/Download/MiuiCleaner.sh>nul 2>nul
	timeout /t 1>nul 2>nul
goto:adb_server
