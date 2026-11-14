-- Servidor: callbacks, permissões, senha de entrada e lista de jogadores.

Callbacks = {}

-- O jogador pede algo ao servidor e espera a resposta (ver ChamarServidor no client/util.lua)
RegisterNetEvent('fotografia:cb', function(nome, id, ...)
    local src = source
    local fn = Callbacks[nome]
    if type(fn) ~= 'function' then return end
    local resultado = table.pack(pcall(fn, src, ...))
    if not resultado[1] then
        print(('[fotografia] erro no callback "%s": %s'):format(tostring(nome), tostring(resultado[2])))
        TriggerClientEvent('fotografia:cbResposta', src, id)
        return
    end
    TriggerClientEvent('fotografia:cbResposta', src, id, table.unpack(resultado, 2, resultado.n))
end)

function Licenca(src)
    for _, id in ipairs(GetPlayerIdentifiers(src)) do
        if id:sub(1, 8) == 'license:' then return id end
    end
    return nil
end

function EhAdmin(src)
    return IsPlayerAceAllowed(src, 'fotografia.admin')
end

function Avisar(src, msg)
    TriggerClientEvent('fotografia:aviso', src, msg)
end

Callbacks.permissoes = function(src)
    return {
        admin = EhAdmin(src),
        ambiente = (not Config.Ambiente.SoAdminPodeMudar) or EhAdmin(src),
    }
end

Callbacks.jogadores = function()
    local lista = {}
    for _, id in ipairs(GetPlayers()) do
        lista[#lista + 1] = { id = tonumber(id), nome = GetPlayerName(id) or ('Jogador ' .. id) }
    end
    table.sort(lista, function(a, b) return a.id < b.id end)
    return lista
end

Callbacks.posicaoJogador = function(_, alvo)
    alvo = tonumber(alvo)
    if not alvo or not GetPlayerName(alvo) then return nil end
    local ped = GetPlayerPed(alvo)
    if not ped or ped == 0 then return nil end
    local c = GetEntityCoords(ped)
    return { x = c.x, y = c.y, z = c.z, h = GetEntityHeading(ped) }
end

-- Senha opcional na entrada (Config.Senha)
AddEventHandler('playerConnecting', function(_, _, deferrals)
    if type(Config.Senha) ~= 'string' or Config.Senha == '' then return end

    deferrals.defer()
    Wait(0)

    local tentativas = 0
    local function mostrarCartao(erro)
        local cartao = {
            type = 'AdaptiveCard',
            version = '1.2',
            ['$schema'] = 'http://adaptivecards.io/schemas/adaptive-card.json',
            body = {
                { type = 'TextBlock', text = Config.NomeServidor, size = 'Large', weight = 'Bolder' },
                {
                    type = 'TextBlock',
                    text = erro or 'Este estúdio é privado. Digite a senha para entrar.',
                    wrap = true,
                    color = erro and 'Attention' or 'Default',
                },
                { type = 'Input.Text', id = 'senha', placeholder = 'Senha' },
            },
            actions = {
                { type = 'Action.Submit', title = 'Entrar' },
            },
        }
        deferrals.presentCard(json.encode(cartao), function(dados)
            if type(dados) == 'table' and dados.senha == Config.Senha then
                deferrals.done()
                return
            end
            tentativas = tentativas + 1
            if tentativas >= 3 then
                deferrals.done('Senha incorreta.')
            else
                mostrarCartao('Senha incorreta. Tente de novo.')
            end
        end)
    end
    mostrarCartao()
end)

-- Mostra no console quem entrou e o identificador (útil para dar admin no server.cfg)
AddEventHandler('playerJoining', function()
    local src = source
    print(('^3[fotografia]^7 %s entrou (ID %s) — identificador: %s'):format(GetPlayerName(src) or '?', src, Licenca(src) or 'sem licença'))
end)

AddEventHandler('onResourceStart', function(recurso)
    if recurso ~= GetCurrentResourceName() then return end
    print(('^3[fotografia]^7 %s pronto! Teclas: %s = câmera, %s = painel.'):format(Config.NomeServidor, Config.Teclas.Camera, Config.Teclas.Painel))
end)
