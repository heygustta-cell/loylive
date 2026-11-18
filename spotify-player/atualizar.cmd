@echo off
setlocal
chcp 65001 >nul
title Sonora - Atualizando
cd /d "%~dp0"

set "URL=https://github.com/heygustta-cell/loylive/archive/refs/heads/claude/spotify-desktop-player-win11-6sxdgo.zip"
set "TMPD=%TEMP%\sonora-update"

echo.
echo   Sonora - atualizacao
echo   ====================
echo.
echo   Baixando a versao mais nova...
if exist "%TMPD%" rmdir /s /q "%TMPD%"
mkdir "%TMPD%"
curl.exe -L --fail --silent --show-error -o "%TMPD%\sonora.zip" "%URL%"
if errorlevel 1 goto erro

echo   Extraindo...
tar.exe -xf "%TMPD%\sonora.zip" -C "%TMPD%"
if errorlevel 1 goto erro

set "SRC="
for /d %%D in ("%TMPD%\loylive-*") do set "SRC=%%D\spotify-player"
if not defined SRC goto erro
if not exist "%SRC%\package.json" goto erro

echo   Copiando os arquivos novos - seu .env e o node_modules sao mantidos...
robocopy "%SRC%" "%~dp0." /E /XD node_modules dist out /XF .env atualizar.cmd /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto erro

echo   Atualizando as dependencias...
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 goto erro

echo   Conferindo a assinatura VMP...
node scripts\vmp.cjs sign-pkg node_modules\electron\dist
if errorlevel 1 echo   [!] Nao foi possivel confirmar a assinatura VMP. Rode depois: npm run vmp:sign-dev

rmdir /s /q "%TMPD%" 2>nul
echo.
echo   Pronto! O Sonora foi atualizado. Abra pelo iniciar.cmd.
echo.
pause
exit /b 0

:erro
echo.
echo   Nao foi possivel atualizar. Veja a mensagem acima.
pause
exit /b 1
