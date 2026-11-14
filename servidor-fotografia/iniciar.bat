@echo off
title Servidor de Fotografia
cd /d "%~dp0"
if not exist "artefatos\FXServer.exe" (
  echo Nao encontrei artefatos\FXServer.exe. Rode o instalar.bat primeiro.
  pause
  exit /b 1
)
if not exist "chave.cfg" (
  echo Falta o arquivo chave.cfg com a sua sv_licenseKey. Veja o LEIAME.md.
  pause
  exit /b 1
)
"artefatos\FXServer.exe" +exec server.cfg
pause
