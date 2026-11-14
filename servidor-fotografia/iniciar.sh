#!/usr/bin/env bash
# Liga o Servidor de Fotografia (Linux / VPS)
cd "$(dirname "$0")"
if [ ! -x artefatos/run.sh ]; then
    echo "Não encontrei artefatos/run.sh. Rode ./instalar.sh primeiro."
    exit 1
fi
if [ ! -f chave.cfg ]; then
    echo "Falta o chave.cfg com a sua sv_licenseKey. Veja o LEIAME.md."
    exit 1
fi
exec ./artefatos/run.sh +exec server.cfg
