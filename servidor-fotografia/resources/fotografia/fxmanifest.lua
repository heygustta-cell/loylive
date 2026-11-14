fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'fotografia'
description 'Modo de jogo de fotografia: câmera livre com foco, filtros, luzes de estúdio, poses, clima, personagem e veículos. Sem RP.'
version '1.0.0'

-- Este recurso é o "modo de jogo" do servidor (substitui o basic-gamemode)
resource_type 'gametype' { name = 'Fotografia' }

dependencies {
    'spawnmanager',
}

shared_scripts {
    'config.lua',
    'shared/util.lua',
}

client_scripts {
    'client/util.lua',
    'client/ambiente.lua',
    'client/camera.lua',
    'client/filtros.lua',
    'client/luzes.lua',
    'client/poses.lua',
    'client/personagem.lua',
    'client/veiculo.lua',
    'client/locais.lua',
    'client/painel.lua',
    'client/comandos.lua',
    'client/base.lua',
}

server_scripts {
    'server/main.lua',
    'server/ambiente.lua',
    'server/dados.lua',
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/app.js',
}
