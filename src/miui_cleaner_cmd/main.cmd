@echo off
title MiuiCleaner - MIUI�����������

:start
adb shell pm list packages>"%temp%\adb_list_packages.tmp" 2>&1
if %errorlevel%==1 (
	findstr /c:"no devices" "%temp%\adb_list_packages.tmp">nul 2>nul && (
		echo �� ��ȷ�����������������ֻ��͵���
		echo �� ��ȷ��С���ֻ����ֿ����������ֻ�
		echo �� ��ȷ������ȷ��USB����ģʽ�Ѵ�
	) || findstr /c:"unauthorized" "%temp%\adb_list_packages.tmp">nul 2>nul && (
		echo �� �����ֻ�������Ȩ��ʾʱ�����ȷ����
	) || (
		type "%temp%\adb_list_packages.tmp"
	)
	echo.
	echo �����ų����Ϻ����������
	pause>nul 2>nul
	goto:start
) else if %errorlevel% geq 1 (
	echo �����뽫�������ƶ���С���ֻ����ְ�װĿ¼�������У��������ǰ��С���ֻ����ֹ���
	pause>nul 2>nul
	start http://zhushou.xiaomi.com/
	goto:eof
)

call:pkg_exist "com.github.gucong3000.miui.cleaner" || (
	if exist "MiuiCleaner.apk" (
		echo �����ֻ��ϰ�װ MiuiCleaner.apk, ��򿪡����� �� �������� �� ������ѡ�� �� USB��װ��
		call:apk_install
	) else (
		echo δ���ֻ����ҵ���MiuiCleaner�����뽫��MiuiCleaner.apk��������"%CD%"�ļ��У���ֱ�Ӱ�װ���ֻ��󣬰����������
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
adb shell am start -n com.github.gucong3000.miui.cleaner/com.stardust.auojs.inrt.SplashActivity>nul 2>nul

echo �����ֻ��ϴ򿪡�MiuiCleaner�������ڡ����ϰ�������ҳ�浯��ʱ���򿪡������صķ��񡱣��ҵ���MiuiCleaner�����������ṩ�ĵ����ϰ�����
echo ���Ⱥ��ֻ��˷���ָ��...

goto:adb_server

:pkg_exist
    findstr /b /e /c:"package:%~1" "%temp%\adb_list_packages.tmp">nul 2>nul
goto:eof

:apk_install
	adb install -t -r -g MiuiCleaner.apk>nul 2>nul || (timeout /t 1>nul 2>nul && goto:apk_install)
goto:eof

:adb_server
	adb shell sh /sdcard/Download/MiuiCleaner.sh>nul 2>nul
	timeout /t 1>nul 2>nul
goto:adb_server

