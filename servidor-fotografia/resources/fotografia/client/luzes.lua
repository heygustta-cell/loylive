-- Luzes de estúdio: spots e luzes pontuais posicionadas pela câmera.
-- Ficam só na sua tela (é você quem está fotografando).

Luzes = { lista = {}, proximoId = 1, marcadores = true }

local spotComSombra = Nativa('DrawShadowedSpotLight', 'DrawSpotLightWithShadow')

local function posicaoEDirecao()
    if Camera.ativa then return Camera.pos, DirecaoDaRotacao(Camera.rot) end
    return GetGameplayCamCoord(), DirecaoDaRotacao(GetGameplayCamRot(2))
end

local function acharLuz(id)
    id = Inteiro(id, -1)
    for i, l in ipairs(Luzes.lista) do
        if l.id == id then return l, i end
    end
    return nil
end

function Luzes.adicionar(tipo)
    if #Luzes.lista >= Config.Luzes.Maximo then
        Notificar(('Limite de %d luzes. Remova alguma no painel.'):format(Config.Luzes.Maximo))
        return nil
    end
    tipo = (tipo == 'ponto') and 'ponto' or 'spot'
    local pos, dir = posicaoEDirecao()
    local luz = {
        id = Luzes.proximoId,
        tipo = tipo,
        pos = pos,
        dir = dir,
        cor = { r = 255, g = 236, b = 214 },
        intensidade = tipo == 'spot' and 6.0 or 2.0,
        alcance = tipo == 'spot' and 25.0 or 8.0,
        abertura = 30.0,
        queda = 1.0,
        borda = 0.0,
        sombra = true,
        ligada = true,
    }
    Luzes.proximoId = Luzes.proximoId + 1
    Luzes.lista[#Luzes.lista + 1] = luz
    Notificar(('Luz %d criada (%s). Ajuste no painel, aba Luzes.'):format(luz.id, tipo == 'spot' and 'spot' or 'pontual'))
    if Painel then Painel.enviar('luzes', Luzes.estadoUI(), true) end
    return luz
end

CreateThread(function()
    while true do
        if #Luzes.lista == 0 then
            Wait(300)
        else
            local marcar = Luzes.marcadores and not Camera.limpo
            for _, l in ipairs(Luzes.lista) do
                local p, d, c = l.pos, l.dir, l.cor
                if l.ligada then
                    if l.tipo == 'ponto' then
                        DrawLightWithRange(p.x, p.y, p.z, c.r, c.g, c.b, l.alcance, l.intensidade)
                    elseif l.sombra and spotComSombra then
                        spotComSombra(p.x, p.y, p.z, d.x, d.y, d.z, c.r, c.g, c.b, l.alcance, l.intensidade, l.borda, l.abertura, l.queda, l.id)
                    else
                        DrawSpotLight(p.x, p.y, p.z, d.x, d.y, d.z, c.r, c.g, c.b, l.alcance, l.intensidade, l.borda, l.abertura, l.queda)
                    end
                end
                if marcar then
                    DrawMarker(28, p.x, p.y, p.z, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.12, 0.12, 0.12, c.r, c.g, c.b, l.ligada and 200 or 60, false, false, 2, false, nil, nil, false)
                    if l.tipo == 'spot' then
                        DrawLine(p.x, p.y, p.z, p.x + d.x * 0.8, p.y + d.y * 0.8, p.z + d.z * 0.8, c.r, c.g, c.b, 255)
                    end
                end
            end
            Wait(0)
        end
    end
end)

local function editar(luz, campo, valor)
    if campo == 'tipo' then
        luz.tipo = (valor == 'ponto') and 'ponto' or 'spot'
    elseif campo == 'cor' and type(valor) == 'table' then
        luz.cor = {
            r = Limitar(Inteiro(valor.r, 255), 0, 255),
            g = Limitar(Inteiro(valor.g, 255), 0, 255),
            b = Limitar(Inteiro(valor.b, 255), 0, 255),
        }
    elseif campo == 'intensidade' then luz.intensidade = Limitar(Numero(valor, 5.0), 0.0, 100.0)
    elseif campo == 'alcance' then luz.alcance = Limitar(Numero(valor, 20.0), 0.5, 200.0)
    elseif campo == 'abertura' then luz.abertura = Limitar(Numero(valor, 30.0), 1.0, 90.0)
    elseif campo == 'queda' then luz.queda = Limitar(Numero(valor, 1.0), 0.0, 50.0)
    elseif campo == 'borda' then luz.borda = Limitar(Numero(valor, 0.0), 0.0, 1.0)
    elseif campo == 'sombra' then luz.sombra = valor == true
    elseif campo == 'ligada' then luz.ligada = valor == true
    end
end

function Luzes.estadoUI()
    local lista = {}
    for i, l in ipairs(Luzes.lista) do
        lista[i] = {
            id = l.id, tipo = l.tipo, cor = l.cor, intensidade = l.intensidade, alcance = l.alcance,
            abertura = l.abertura, queda = l.queda, borda = l.borda, sombra = l.sombra, ligada = l.ligada,
        }
    end
    return { marcadores = Luzes.marcadores, maximo = Config.Luzes.Maximo, lista = lista }
end

function Luzes.comandoUI(d)
    local acao = d.acao
    if acao == 'adicionar' then
        Luzes.adicionar(d.tipo)
        return { luzes = Luzes.estadoUI(), rerender = true }
    elseif acao == 'marcadores' then
        Luzes.marcadores = d.valor == true
        return { luzes = Luzes.estadoUI() }
    elseif acao == 'limpar' then
        Luzes.lista = {}
        return { luzes = Luzes.estadoUI(), rerender = true }
    end

    local luz, indice = acharLuz(d.id)
    if not luz then return { luzes = Luzes.estadoUI(), rerender = true } end

    if acao == 'remover' then
        table.remove(Luzes.lista, indice)
        return { luzes = Luzes.estadoUI(), rerender = true }
    elseif acao == 'moverCamera' then
        luz.pos, luz.dir = posicaoEDirecao()
        Notificar(('Luz %d movida para onde a câmera está.'):format(luz.id))
    elseif acao == 'apontarPersonagem' then
        local rosto = GetPedBoneCoords(PlayerPedId(), 31086, 0.0, 0.0, 0.0)
        luz.dir = Normalizar(rosto - luz.pos)
        Notificar(('Luz %d apontada para o seu rosto.'):format(luz.id))
    elseif acao == 'editar' then
        editar(luz, d.campo, d.valor)
        if d.campo == 'tipo' then return { luzes = Luzes.estadoUI(), rerender = true } end
    end
    return { luzes = Luzes.estadoUI() }
end
