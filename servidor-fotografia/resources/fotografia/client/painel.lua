-- Ligação entre o jogo e o painel (HTML em html/).

Painel = { aberto = false }

local function configUI()
    local poses = {}
    for i, p in ipairs(Config.Poses) do
        poses[i] = { indice = i, nome = p.nome, categoria = p.categoria, cmd = p.cmd, congelavel = p.cenario == nil }
    end
    local locais = {}
    for i, l in ipairs(Config.Locais) do
        locais[i] = { indice = i, nome = l.nome, categoria = l.categoria }
    end
    return {
        nome = Config.NomeServidor,
        teclas = Config.Teclas,
        climas = Config.Climas,
        nuvens = Config.Nuvens,
        horarios = Config.HorariosRapidos,
        filtros = Config.Filtros,
        ajustes = Config.AjustesExtras,
        poses = poses,
        expressoes = Config.Expressoes,
        modelos = Config.ModelosRapidos,
        veiculos = Config.Veiculos,
        locais = locais,
        fovMin = Config.Camera.FovMin,
        fovMax = Config.Camera.FovMax,
    }
end

function Painel.estadoCompleto()
    return {
        config = configUI(),
        camera = Camera.estadoUI(),
        ambiente = Ambiente.estadoUI(),
        filtros = Filtros.estadoUI(),
        luzes = Luzes.estadoUI(),
        poses = Poses.estadoUI(),
        personagem = Personagem.estadoUI(),
        veiculo = Veiculo.estadoUI(),
        locais = Locais.estadoUI(),
    }
end

function Painel.abrir()
    if Painel.aberto then return end
    Painel.aberto = true
    SetNuiFocus(true, true)
    SendNUIMessage({ tipo = 'abrir', estado = Painel.estadoCompleto() })
end

function Painel.fechar()
    if not Painel.aberto then return end
    Painel.aberto = false
    SetNuiFocus(false, false)
    SendNUIMessage({ tipo = 'fechar' })
end

function Painel.alternar()
    if Painel.aberto then Painel.fechar() else Painel.abrir() end
end

-- Manda uma parte do estado para o painel (se estiver aberto).
-- estrutural = true redesenha a aba (quando muda a quantidade de itens, por exemplo).
function Painel.enviar(parte, dados, estrutural)
    if not Painel.aberto then return end
    SendNUIMessage({ tipo = 'atualizar', parte = parte, dados = dados, estrutural = estrutural == true })
end

local function registrar(nome, fn)
    RegisterNUICallback(nome, function(dados, cb)
        local ok, resposta = pcall(fn, type(dados) == 'table' and dados or {})
        if not ok then
            print(('^1[fotografia] erro no painel (%s): %s^7'):format(nome, tostring(resposta)))
            cb({ erro = 'Algo deu errado. Veja o console (F8).' })
            return
        end
        cb(resposta or {})
    end)
end

registrar('fechar', function()
    Painel.fechar()
    return {}
end)
registrar('camera', function(d) return Camera.comandoUI(d) end)
registrar('ambiente', function(d) return Ambiente.comandoUI(d) end)
registrar('filtros', function(d) return Filtros.comandoUI(d) end)
registrar('luzes', function(d) return Luzes.comandoUI(d) end)
registrar('poses', function(d) return Poses.comandoUI(d) end)
registrar('personagem', function(d) return Personagem.comandoUI(d) end)
registrar('veiculo', function(d) return Veiculo.comandoUI(d) end)
registrar('locais', function(d) return Locais.comandoUI(d) end)
