-- Teleporte: pontos de foto prontos, locais salvos pela galera, marcador do mapa e jogadores.

Locais = { jogadores = {} }

-- Cópia local da lista que o servidor publica em GlobalState.fotoLocais
local cacheSalvos = GlobalState.fotoLocais or {}

local function salvos()
    return cacheSalvos
end

function Locais.irPreset(indice)
    local l = Config.Locais[indice]
    if l then Teleportar(l.x, l.y, l.z, l.h) end
end

function Locais.irSalvo(id)
    for _, l in ipairs(salvos()) do
        if l.id == id then
            Teleportar(l.x, l.y, l.z, l.h)
            return
        end
    end
    Notificar('Esse local não existe mais.')
end

function Locais.irMarcador()
    local blip = GetFirstBlipInfoId(8)
    if not DoesBlipExist(blip) then
        Notificar('Marque um ponto no mapa (ESC > Mapa) primeiro.')
        return
    end
    local c = GetBlipInfoIdCoord(blip)
    Teleportar(c.x, c.y, nil)
end

function Locais.irSpawn()
    local s = Config.Spawn
    Teleportar(s.x, s.y, s.z, s.w)
end

function Locais.salvar(nome)
    nome = tostring(nome or ''):gsub('^%s+', ''):gsub('%s+$', '')
    if nome == '' then
        Notificar('Dê um nome para o local.')
        return
    end
    local ped = PlayerPedId()
    local c = GetEntityCoords(ped)
    TriggerServerEvent('fotografia:salvarLocal', nome, c.x, c.y, c.z - 0.98, GetEntityHeading(ped))
end

function Locais.atualizarJogadores()
    Locais.jogadores = ChamarServidor('jogadores') or {}
end

function Locais.irJogador(id)
    local p = ChamarServidor('posicaoJogador', id)
    if not p then
        Notificar('Jogador não encontrado.')
        return
    end
    Teleportar(p.x + 1.0, p.y + 1.0, p.z - 0.98, p.h)
end

AddStateBagChangeHandler('fotoLocais', 'global', function(_, _, valor)
    cacheSalvos = valor or {}
    if Painel then Painel.enviar('locais', Locais.estadoUI(), true) end
end)

function Locais.estadoUI()
    local lista = {}
    for i, l in ipairs(salvos()) do
        lista[i] = { id = l.id, nome = l.nome, autor = l.autorNome or '' }
    end
    return { salvos = lista, jogadores = Locais.jogadores, meuId = GetPlayerServerId(PlayerId()) }
end

function Locais.comandoUI(d)
    local acao = d.acao
    if acao == 'preset' then
        Locais.irPreset(Inteiro(d.indice))
    elseif acao == 'salvo' then
        Locais.irSalvo(Inteiro(d.id))
    elseif acao == 'marcador' then
        Locais.irMarcador()
    elseif acao == 'spawn' then
        Locais.irSpawn()
    elseif acao == 'salvar' then
        Locais.salvar(d.nome)
    elseif acao == 'remover' then
        TriggerServerEvent('fotografia:removerLocal', Inteiro(d.id))
    elseif acao == 'jogadores' then
        Locais.atualizarJogadores()
        return { locais = Locais.estadoUI(), rerender = true }
    elseif acao == 'irJogador' then
        Locais.irJogador(Inteiro(d.id))
    end
    return {}
end
