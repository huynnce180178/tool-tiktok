@echo off
title TikTok Booster Dev Server
color 0a

echo ===================================================
echo   KHOI DONG TIKTOK BOOSTER DEV SERVER (LOCAL)
echo ===================================================
echo.

:: Kiem tra node_modules da duoc cai dat chua
if not exist node_modules (
    echo [INFO] Khong tim thay node_modules. Dang tien hanh tai dependencies...
    call npm install
)

:: Gioi han bo nho cua Node.js de tranh lag may (max-old-space-size=1024MB)
set NODE_OPTIONS=--max-old-space-size=1024

:run
echo [INFO] Dang khoi dong server Vite...
echo [INFO] Nhan Ctrl+C de dung lai.
echo.

:: Chay Vite dev server
call npm run dev

:: Tu dong khoi dong lai neu server bi sap
echo.
echo [WARNING] Server da bi dung dot ngot!
echo [INFO] Tu dong restart sau 5 giay...
timeout /t 5 > nul
goto run
