@echo off
setlocal
cd /d "%~dp0"
echo [thumb-prebuild] Starting thumbnail cache generation...
node prebuild-thumbnails.js %*
set EXIT_CODE=%ERRORLEVEL%
echo.
if %EXIT_CODE%==0 (
  echo [thumb-prebuild] Finished successfully.
) else (
  echo [thumb-prebuild] Failed with exit code %EXIT_CODE%.
)
pause
exit /b %EXIT_CODE%
