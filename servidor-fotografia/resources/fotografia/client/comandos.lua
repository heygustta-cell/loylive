-- Teclas e comandos de chat.

local function comando(nome, fn)
    RegisterCommand(nome, function(_, args, bruto)
        CreateThread(function() fn(args, bruto) end)
    end, false)
end

local function chat(titulo, texto)
    TriggerEvent('chat:addMessage', { color = { 255, 181, 71 }, multiline = true, args = { titulo, texto } })
end

-- Teclas (trocáveis em Configurações > Teclas > FiveM)
comando('fotocamera', function() Camera.alternar() end)
comando('fotopainel', function() Painel.alternar() end)
RegisterKeyMapping('fotocamera', 'Fotografia: ligar/desligar câmera livre', 'keyboard', Config.Teclas.Camera)
RegisterKeyMapping('fotopainel', 'Fotografia: abrir o painel', 'keyboard', Config.Teclas.Painel)

comando('foto', function() Camera.alternar() end)
comando('painel', function() Painel.abrir() end)

comando('carro', function(args)
    if not args[1] then chat('Fotografia', 'Use: /carro modelo   (ex.: /carro elegy2)') return end
    Veiculo.criar(args[1])
end)

comando('dv', function()
    Veiculo.comandoUI({ acao = 'apagar' })
end)

comando('reparar', function()
    Veiculo.comandoUI({ acao = 'reparar' })
    Veiculo.comandoUI({ acao = 'lavar' })
end)

comando('hora', function(args)
    local h = tonumber(args[1])
    if not h then chat('Fotografia', 'Use: /hora 18 30') return end
    if Ambiente.mudar({ hora = h, minuto = tonumber(args[2]) or 0 }) then
        Notificar(('Horário: ~y~%02d:%02d'):format(math.floor(Limitar(h, 0, 23)), math.floor(Limitar(tonumber(args[2]) or 0, 0, 59))))
    end
end)

comando('congelar', function()
    local a = Ambiente.atual()
    if a and Ambiente.mudar({ congelado = not a.congelado }) then
        Notificar(a.congelado and 'O relógio voltou a andar.' or 'Horário congelado.')
    end
end)

comando('clima', function(args)
    local alvo = tostring(args[1] or ''):upper()
    for _, c in ipairs(Config.Climas) do
        if c.id == alvo or c.nome:upper() == alvo then
            if Ambiente.mudar({ clima = c.id }) then Notificar('Clima: ~y~' .. c.nome) end
            return
        end
    end
    local nomes = {}
    for _, c in ipairs(Config.Climas) do nomes[#nomes + 1] = c.id end
    chat('Climas', table.concat(nomes, ', '))
end)

comando('tp', function() Locais.irMarcador() end)

comando('ir', function(args)
    local id = tonumber(args[1])
    if not id then chat('Fotografia', 'Use: /ir ID-do-jogador') return end
    Locais.irJogador(id)
end)

comando('local', function(args, bruto)
    local busca = bruto:gsub('^%S+%s*', ''):lower()
    if busca == '' then chat('Fotografia', 'Use: /local nome (ou abra o painel na aba Locais)') return end
    for i, l in ipairs(Config.Locais) do
        if l.nome:lower():find(busca, 1, true) then Locais.irPreset(i) return end
    end
    for _, l in ipairs(GlobalState.fotoLocais or {}) do
        if l.nome:lower():find(busca, 1, true) then Locais.irSalvo(l.id) return end
    end
    Notificar('Local não encontrado.')
end)

comando('salvarlocal', function(_, bruto)
    Locais.salvar(bruto:gsub('^%S+%s*', ''))
end)

comando('e', function(args)
    local cmd = args[1]
    if not cmd then
        local lista = {}
        for _, p in ipairs(Config.Poses) do lista[#lista + 1] = p.cmd end
        chat('Poses', table.concat(lista, ', ') .. '   |   /e parar')
        return
    end
    if cmd == 'parar' or cmd == 'p' then Poses.parar() return end
    local p = Poses.porComando(cmd)
    if p then Poses.tocar(p) else Notificar('Pose não encontrada. Digite ~y~/e~s~ para ver a lista.') end
end)

comando('anim', function(args)
    if not args[1] or not args[2] then chat('Fotografia', 'Use: /anim dicionario animacao [flag]') return end
    Poses.tocar({ nome = args[1] .. ' / ' .. args[2], dict = args[1], anim = args[2], flag = tonumber(args[3]) or 1 })
end)

comando('filtro', function(args)
    local nome = args[1]
    if not nome or nome == 'limpar' or nome == 'nenhum' then
        Filtros.definir('')
        Filtros.definirExtra('')
        Notificar('Filtros removidos.')
        return
    end
    Filtros.definir(nome, tonumber(args[2]))
    Notificar('Filtro: ~y~' .. nome)
end)

comando('modelo', function(args)
    if not args[1] then chat('Fotografia', 'Use: /modelo nome   (ex.: /modelo mp_f_freemode_01)') return end
    Personagem.comandoUI({ acao = 'modelo', modelo = args[1] })
end)

comando('luz', function(args) Luzes.adicionar(args[1] == 'ponto' and 'ponto' or 'spot') end)
comando('limparluzes', function()
    Luzes.lista = {}
    Notificar('Luzes removidas.')
end)

comando('fotoajuda', function()
    chat('Fotografia', ('%s liga a câmera  |  %s abre o painel'):format(Config.Teclas.Camera, Config.Teclas.Painel))
    chat('Câmera', 'WASD move  |  Espaço/Ctrl sobe/desce  |  Shift rápido, Alt lento  |  rodinha zoom  |  Z/C inclina, R zera  |  F foca  |  G grade  |  H esconde a interface  |  L cria luz')
    chat('Comandos', '/carro  /dv  /reparar  /hora  /clima  /congelar  /tp  /ir  /local  /salvarlocal  /e  /anim  /filtro  /modelo  /luz  /limparluzes')
end)

CreateThread(function()
    Wait(2000)
    local function sugestao(cmd, ajuda, params)
        TriggerEvent('chat:addSuggestion', '/' .. cmd, ajuda, params or {})
    end
    sugestao('foto', 'Liga/desliga a câmera livre de fotografia')
    sugestao('painel', 'Abre o painel de fotografia')
    sugestao('fotoajuda', 'Mostra os controles e comandos')
    sugestao('carro', 'Cria um veículo', { { name = 'modelo', help = 'ex.: elegy2, zentorno, futo' } })
    sugestao('dv', 'Apaga o veículo atual')
    sugestao('reparar', 'Conserta e lava o veículo')
    sugestao('hora', 'Muda o horário', { { name = 'hora', help = '0 a 23' }, { name = 'minuto', help = '0 a 59' } })
    sugestao('congelar', 'Congela/descongela o relógio')
    sugestao('clima', 'Muda o clima', { { name = 'clima', help = 'EXTRASUNNY, CLEAR, CLOUDS, FOGGY, RAIN, THUNDER, XMAS...' } })
    sugestao('tp', 'Teleporta para o marcador do mapa')
    sugestao('ir', 'Vai até outro jogador', { { name = 'id', help = 'ID do jogador' } })
    sugestao('local', 'Vai para um ponto de foto', { { name = 'nome', help = 'parte do nome, ex.: chiliad' } })
    sugestao('salvarlocal', 'Salva o lugar onde você está (para todos)', { { name = 'nome', help = 'nome do local' } })
    sugestao('e', 'Faz uma pose', { { name = 'pose', help = 'digite /e sozinho para ver a lista, /e parar' } })
    sugestao('anim', 'Toca qualquer animação', { { name = 'dicionario' }, { name = 'animacao' }, { name = 'flag', help = '1 repete, 49 só tronco, 2 trava no fim' } })
    sugestao('filtro', 'Aplica um filtro de cor', { { name = 'nome', help = 'ex.: cinema, NG_filmic05 ou limpar' }, { name = 'forca', help = '0.0 a 1.5' } })
    sugestao('modelo', 'Troca o modelo do personagem', { { name = 'modelo', help = 'ex.: mp_f_freemode_01, a_c_husky' } })
    sugestao('luz', 'Cria uma luz onde a câmera está', { { name = 'tipo', help = 'spot (padrão) ou ponto' } })
    sugestao('limparluzes', 'Remove todas as luzes')
end)
