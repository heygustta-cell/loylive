# Instalador do Servidor de Fotografia (Windows)
# Baixa o programa do servidor FiveM e os recursos básicos, e pede a sua chave.
# Rode pelo instalar.bat (duplo clique).

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # deixa os downloads bem mais rápidos
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Raiz = $PSScriptRoot
$Artefatos = Join-Path $Raiz 'artefatos'
$Recursos = Join-Path $Raiz 'resources'
$Temp = Join-Path $env:TEMP 'servidor-fotografia'
New-Item -ItemType Directory -Force -Path $Temp | Out-Null

function Passo($texto) { Write-Host "`n==> $texto" -ForegroundColor Yellow }
function Ok($texto) { Write-Host "    $texto" -ForegroundColor Green }

function Extrair7z($arquivo, $destino) {
    $seteZip = @("$env:ProgramFiles\7-Zip\7z.exe", "${env:ProgramFiles(x86)}\7-Zip\7z.exe") |
        Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
    if ($seteZip) {
        & $seteZip x "$arquivo" "-o$destino" -y | Out-Null
        return (Test-Path -LiteralPath (Join-Path $destino 'FXServer.exe'))
    }
    # Sem 7-Zip: tenta o tar que vem no Windows 10/11
    $antes = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & tar.exe -xf "$arquivo" -C "$destino" 2>&1 | Out-Null } catch { }
    $ErrorActionPreference = $antes
    return (Test-Path -LiteralPath (Join-Path $destino 'FXServer.exe'))
}

# ------------------------------------------------------------------ 1. FXServer
if (Test-Path -LiteralPath (Join-Path $Artefatos 'FXServer.exe')) {
    Passo 'Programa do servidor já instalado (pasta artefatos). Pulando.'
} else {
    Passo 'Procurando a versão recomendada do servidor FiveM...'
    $url = $null
    try {
        $info = Invoke-RestMethod -Uri 'https://changelogs-live.fivem.net/api/changelog/versions/win32/server'
        $url = $info.recommended_download
    } catch { }
    if (-not $url) {
        Write-Host @"

Não consegui descobrir o link automaticamente. Faça assim:
  1. Abra https://runtime.fivem.net/artifacts/fivem/build_server_windows/master/
  2. Clique em "LATEST RECOMMENDED" e baixe o server.7z
  3. Extraia tudo para a pasta: $Artefatos
  4. Rode este instalador de novo.
"@ -ForegroundColor Red
        exit 1
    }
    $arquivo = Join-Path $Temp 'server.7z'
    Passo "Baixando o servidor (uns 100 MB)..."
    Invoke-WebRequest -Uri $url -OutFile $arquivo
    New-Item -ItemType Directory -Force -Path $Artefatos | Out-Null
    Passo 'Extraindo...'
    if (-not (Extrair7z $arquivo $Artefatos)) {
        Write-Host @"

Não consegui extrair o arquivo .7z sozinho. Faça assim:
  1. Instale o 7-Zip (https://www.7-zip.org) OU abra o arquivo pelo Explorador (Windows 11 abre .7z)
  2. Extraia "$arquivo" para a pasta: $Artefatos
  3. Rode este instalador de novo.
"@ -ForegroundColor Red
        exit 1
    }
    Ok 'Servidor instalado.'
}

# ------------------------------------------------------------------ 2. Recursos básicos
$temSpawn = Get-ChildItem -LiteralPath $Recursos -Directory -Recurse -Filter 'spawnmanager' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($temSpawn) {
    Passo 'Recursos básicos já instalados. Pulando.'
} else {
    Passo 'Baixando os recursos básicos do FiveM (cfx-server-data)...'
    $zip = Join-Path $Temp 'cfx-server-data.zip'
    Invoke-WebRequest -Uri 'https://github.com/citizenfx/cfx-server-data/archive/refs/heads/master.zip' -OutFile $zip
    $pasta = Join-Path $Temp 'cfx'
    if (Test-Path -LiteralPath $pasta) { Remove-Item -LiteralPath $pasta -Recurse -Force }
    Expand-Archive -LiteralPath $zip -DestinationPath $pasta -Force
    $origem = Join-Path $pasta 'cfx-server-data-master\resources'
    # robocopy lida bem com as pastas [entre colchetes]
    & robocopy "$origem" "$Recursos" /E /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw 'Falha ao copiar os recursos básicos.' }
    Ok 'Recursos básicos instalados.'
}

# ------------------------------------------------------------------ 3. Chave
$chave = Join-Path $Raiz 'chave.cfg'
if (Test-Path -LiteralPath $chave) {
    Passo 'Arquivo chave.cfg já existe. Pulando.'
} else {
    Passo 'Chave do servidor'
    Write-Host '    Pegue sua chave grátis em https://portal.cfx.re (Servers > Registration Keys).'
    $k = Read-Host '    Cole a chave aqui (ou só aperte Enter para fazer depois)'
    if ($k -and $k.Trim()) {
        Set-Content -LiteralPath $chave -Value ('sv_licenseKey "' + $k.Trim() + '"') -Encoding ASCII
        Ok 'Chave salva em chave.cfg.'
    } else {
        Write-Host '    Depois copie chave.cfg.exemplo para chave.cfg e cole a chave lá.' -ForegroundColor Red
    }
}

Passo 'Pronto! Use o iniciar.bat para ligar o servidor.'
Write-Host '    No FiveM, aperte F8 e digite:  connect localhost' -ForegroundColor Cyan
