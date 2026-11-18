@echo off
chcp 65001 >nul
title Sonora
cd /d "%~dp0"
if not exist "node_modules\electron\dist" goto nao_configurado
echo.
echo   Abrindo o Sonora... deixe esta janela aberta enquanto usa o app.
echo.
call npm run dev
if errorlevel 1 pause
exit /b 0

:nao_configurado
echo.
echo   O Sonora ainda nao foi configurado. Rode o instalar.cmd primeiro.
echo.
pause
exit /b 1
