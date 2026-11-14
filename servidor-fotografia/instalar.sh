#!/usr/bin/env bash
# Instalador do Servidor de Fotografia (Linux / VPS)
set -euo pipefail
cd "$(dirname "$0")"

temp="$(mktemp -d)"
trap 'rm -rf -- "$temp"' EXIT

echo "==> Programa do servidor (FXServer)"
if [ -x artefatos/run.sh ]; then
    echo "    Já instalado. Pulando."
else
    url="$(curl -fsSL https://changelogs-live.fivem.net/api/changelog/versions/linux/server \
        | sed -n 's/.*"recommended_download"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
    if [ -z "$url" ]; then
        echo "Não achei o link. Baixe o fx.tar.xz em https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/"
        echo "e extraia em ./artefatos"
        exit 1
    fi
    curl -fL "$url" -o "$temp/fx.tar.xz"
    mkdir -p artefatos
    tar -xJf "$temp/fx.tar.xz" -C artefatos
    echo "    Instalado."
fi

echo "==> Recursos básicos (cfx-server-data)"
if find resources -maxdepth 4 -type d -name spawnmanager | grep -q .; then
    echo "    Já instalados. Pulando."
else
    curl -fL https://github.com/citizenfx/cfx-server-data/archive/refs/heads/master.tar.gz | tar -xz -C "$temp"
    cp -rn "$temp/cfx-server-data-master/resources/." resources/
    echo "    Instalados."
fi

echo "==> Chave do servidor"
if [ -f chave.cfg ]; then
    echo "    chave.cfg já existe. Pulando."
else
    echo "    Pegue sua chave grátis em https://portal.cfx.re (Servers > Registration Keys)."
    read -rp "    Cole a chave (ou Enter para fazer depois): " chave || true
    if [ -n "${chave:-}" ]; then
        printf 'sv_licenseKey "%s"\n' "$chave" > chave.cfg
        echo "    Salva em chave.cfg."
    else
        echo "    Depois: cp chave.cfg.exemplo chave.cfg e cole a chave."
    fi
fi

echo "==> Pronto! Ligue com ./iniciar.sh"
