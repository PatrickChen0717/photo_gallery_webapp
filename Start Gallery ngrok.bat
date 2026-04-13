@echo off
setlocal
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0Start Gallery ngrok.ps1"
set EXIT_CODE=%ERRORLEVEL%
echo.
if not %EXIT_CODE%==0 (
  echo [gallery-ngrok] Launcher exited with code %EXIT_CODE%.
)
pause
exit /b %EXIT_CODE%
