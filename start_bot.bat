@echo off
title Ferghana Davomat Bot (AUTO-RESTART)
cd /d "%~dp0"
echo ---------------------------------------------------
echo  FERG'ONA MMTB DAVOMAT BOTI - ISHGA TUSHMOQDA...
echo ---------------------------------------------------

:loop
node index.js
echo.
echo ⚠️ DIQQAT: Bot to'xtab qoldi (yoki o'chirildi).
echo ⏳ 5 soniyadan keyin qayta ishga tushadi...
timeout /t 5 >nul
goto loop
