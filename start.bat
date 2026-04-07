@echo off
title Virtual Cosmos - Launcher
color 0B

echo.
echo  ===========================================
echo    VIRTUAL COSMOS - ONE CLICK LAUNCHER
echo  ===========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js is not installed!
    echo  Please install it from: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%a in ('node -v') do set NODE_VER=%%a
echo  [OK] Node.js found: %NODE_VER%

:: Setup server .env if missing
if not exist "server\.env" (
    echo.
    echo  [SETUP] Creating server\.env from example...
    copy "server\.env.example" "server\.env" >nul
    echo  [OK] server\.env created. Edit it if you need a custom MongoDB URI.
)

:: Install root dependencies
echo.
echo  [1/3] Installing root dependencies...
call npm install --silent
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Root npm install failed.
    pause
    exit /b 1
)

:: Install server dependencies
echo  [2/3] Installing server dependencies...
cd server
call npm install --silent
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Server npm install failed.
    pause
    exit /b 1
)
cd ..

:: Install client dependencies
echo  [3/3] Installing client dependencies...
cd client
call npm install --silent
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Client npm install failed.
    pause
    exit /b 1
)
cd ..

echo.
echo  ===========================================
echo    All dependencies installed!
echo    Starting Virtual Cosmos...
echo.
echo    Backend  -> http://localhost:3001
echo    Frontend -> http://localhost:5173
echo  ===========================================
echo.
echo  Press Ctrl+C in either window to stop.
echo.

:: Open browser after a brief delay (background)
start /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:5173"

:: Launch server and client in separate windows
start "Virtual Cosmos - Server" cmd /k "cd /d %~dp0server && npm run dev"
timeout /t 2 /nobreak >nul
start "Virtual Cosmos - Client" cmd /k "cd /d %~dp0client && npm run dev"

echo  Both windows are now running!
echo  Visit http://localhost:5173 in your browser.
echo.
pause
