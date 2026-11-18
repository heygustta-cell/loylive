@echo off
chcp 65001 >nul
title Sonora - Criando o instalador
cd /d "%~dp0"
echo.
echo   Gerando o instalador do Sonora (com assinatura VMP)...
echo.
call npm run dist:win
if errorlevel 1 goto erro
echo.
echo   Pronto! O instalador esta na pasta "dist" (Sonora-Setup-*.exe).
start "" "%~dp0dist"
pause
exit /b 0

:erro
echo.
echo   Algo deu errado. Veja as mensagens acima.
pause
exit /b 1
