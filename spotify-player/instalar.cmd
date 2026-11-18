@echo off
setlocal
chcp 65001 >nul
title Sonora - Configuracao
cd /d "%~dp0"

echo.
echo   Sonora - configuracao
echo   =====================
echo.

set "INSTALOU=0"

node --version >nul 2>nul
if errorlevel 1 call :instalar OpenJS.NodeJS.LTS "Node.js"

git --version >nul 2>nul
if errorlevel 1 call :instalar Git.Git "Git"

py -3 --version >nul 2>nul
if not errorlevel 1 goto python_ok
python --version >nul 2>nul
if not errorlevel 1 goto python_ok
call :instalar Python.Python.3.12 "Python 3"
:python_ok

if "%INSTALOU%"=="1" goto reabrir

node scripts\setup.cjs %*
set "CODIGO=%errorlevel%"
echo.
pause
exit /b %CODIGO%

:reabrir
echo.
echo   Programas instalados com sucesso.
echo   FECHE esta janela e de dois cliques no instalar.cmd de novo
echo   para o Windows reconhecer os programas novos.
echo.
pause
exit /b 0

:instalar
where winget >nul 2>nul
if errorlevel 1 goto sem_winget
echo   Instalando %~2 com o winget...
winget install --id %~1 -e --source winget --accept-source-agreements --accept-package-agreements
set "INSTALOU=1"
exit /b 0

:sem_winget
echo   [!] %~2 nao encontrado e o winget nao esta disponivel.
echo       Instale manualmente: Node.js em https://nodejs.org , Git em https://git-scm.com
echo       e Python em https://www.python.org , depois rode este arquivo de novo.
pause
exit 1
