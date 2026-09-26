@echo off
chcp 65001 >nul
title Farg'ona Davomat Tizimi va Bot (Versiya: 21.09.2026)
echo ===================================================
echo   FARG'ONA VILOYAT DAVOMAT BOTI VA PLATFORMASI
echo   Versiya sanasi: 21.09.2026
echo ===================================================
cd /d "E:\gemini\projects\davomat_dashboard\21.09.2026"

echo Web Panel manzili: http://localhost:3000
echo Tizim ishga tushirilmoqda...
node index.js
pause
