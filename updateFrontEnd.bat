@echo off

set SOURCE_DIR=..\mio-chat-frontend\dist
set DEST_DIR=.\dist

echo 正在更新前端...
xcopy /E /Y %SOURCE_DIR% %DEST_DIR%

if %errorlevel% equ 0 (
    echo 前端更新完成！
) else (
    echo 前端更新失败。
)

pause
