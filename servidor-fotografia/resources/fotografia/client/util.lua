-- Funções de apoio usadas pelos outros arquivos do cliente.

Permissoes = nil -- preenchido ao entrar (ver base.lua)

-- Algumas nativas do GTA mudaram de nome entre versões do FiveM: devolve a primeira que existir.
function Nativa(...)
    for _, nome in ipairs({ ... }) do
        local fn = _G[nome]
        if type(fn) == 'function' then return fn end
    end
    return nil
end

function Notificar(msg)
    msg = tostring(msg)
    if Painel and Painel.aberto then
        SendNUIMessage({ tipo = 'aviso', texto = (msg:gsub('~.-~', '')) })
        return
    end
    BeginTextCommandThefeedPost('STRING')
    AddTextComponentSubstringPlayerName(msg)
    EndTextCommandThefeedPostTicker(false, true)
end

RegisterNetEvent('fotografia:aviso', function(msg) Notificar(msg) end)

-- Números vindos do painel (JSON) podem chegar como texto ou decimal: estes garantem o tipo certo.
function Inteiro(v, padrao)
    v = tonumber(v)
    if not v then return padrao or 0 end
    return math.floor(v + 0.0)
end

function Numero(v, padrao)
    v = tonumber(v)
    if not v then return (padrao or 0.0) + 0.0 end
    return v + 0.0
end

-- Dá a volta: passou do máximo vai para o mínimo e vice-versa
function Circular(v, minimo, maximo)
    if maximo < minimo then return minimo end
    if v > maximo then return minimo end
    if v < minimo then return maximo end
    return v
end

function Normalizar(v)
    local tamanho = #v
    if tamanho < 0.0001 then return vector3(0.0, 0.0, 0.0) end
    return v * (1.0 / tamanho)
end

-- Rotação de câmera (graus: x = inclinação, z = direção) -> vetor "para frente"
function DirecaoDaRotacao(rot)
    local rx, rz = math.rad(rot.x), math.rad(rot.z)
    local c = math.cos(rx)
    return vector3(-math.sin(rz) * c, math.cos(rz) * c, math.sin(rx))
end

-- Vetor -> inclinação e direção (graus)
function RotacaoDaDirecao(d)
    local direcao = math.deg(math.atan(-d.x, d.y))
    local inclinacao = math.deg(math.asin(Limitar(d.z, -1.0, 1.0)))
    return inclinacao, direcao
end

function CarregarModelo(modelo, tempoMaximo)
    local hash = type(modelo) == 'number' and modelo or GetHashKey(modelo)
    if not IsModelInCdimage(hash) then return nil end
    RequestModel(hash)
    local limite = GetGameTimer() + (tempoMaximo or 10000)
    while not HasModelLoaded(hash) do
        if GetGameTimer() > limite then return nil end
        Wait(0)
    end
    return hash
end

function CarregarAnimDict(dict)
    if type(dict) ~= 'string' or dict == '' or not DoesAnimDictExist(dict) then return false end
    RequestAnimDict(dict)
    local limite = GetGameTimer() + 5000
    while not HasAnimDictLoaded(dict) do
        if GetGameTimer() > limite then return false end
        Wait(0)
    end
    return true
end

-- Pedir algo ao servidor e esperar a resposta: local a, b = ChamarServidor('nome', ...)
local pendentes, proximoPedido = {}, 0

function ChamarServidor(nome, ...)
    proximoPedido = proximoPedido + 1
    local id = proximoPedido
    local p = promise.new()
    pendentes[id] = p
    TriggerServerEvent('fotografia:cb', nome, id, ...)
    SetTimeout(8000, function()
        if pendentes[id] then
            pendentes[id] = nil
            p:resolve({ n = 0 })
        end
    end)
    local r = Citizen.Await(p)
    return table.unpack(r, 1, r.n)
end

RegisterNetEvent('fotografia:cbResposta', function(id, ...)
    local p = pendentes[id]
    if not p then return end
    pendentes[id] = nil
    p:resolve(table.pack(...))
end)

-- Teleporte que espera o mapa carregar e acha o chão. Se z for nil, procura o chão de cima para baixo.
local teleportando = false

function Teleportar(x, y, z, direcao)
    if teleportando then return end
    teleportando = true
    CreateThread(function()
        local ped = PlayerPedId()
        local ent = ped
        local veh = GetVehiclePedIsIn(ped, false)
        if veh ~= 0 and GetPedInVehicleSeat(veh, -1) == ped then ent = veh end

        DoScreenFadeOut(250)
        local limite = GetGameTimer() + 1000
        while not IsScreenFadedOut() and GetGameTimer() < limite do Wait(0) end

        x, y = x + 0.0, y + 0.0
        local zInicial = z and (z + 0.0) or 500.0
        FreezeEntityPosition(ent, true)
        SetEntityCoordsNoOffset(ent, x, y, zInicial, false, false, false)
        RequestCollisionAtCoord(x, y, zInicial)
        limite = GetGameTimer() + 4000
        while not HasCollisionLoadedAroundEntity(ent) and GetGameTimer() < limite do
            RequestCollisionAtCoord(x, y, zInicial)
            Wait(0)
        end

        local chao
        if z then
            local ok, gz = GetGroundZFor_3dCoord(x, y, z + 3.0, false)
            if ok and math.abs(gz - z) < 12.0 then chao = gz else chao = z + 0.0 end
        else
            for altura = 950.0, 0.0, -50.0 do
                SetEntityCoordsNoOffset(ent, x, y, altura, false, false, false)
                RequestCollisionAtCoord(x, y, altura)
                Wait(40)
                local ok, gz = GetGroundZFor_3dCoord(x, y, altura, false)
                if ok then chao = gz break end
            end
            if not chao then
                local temAgua, aguaZ = GetWaterHeight(x, y, 100.0)
                chao = temAgua and aguaZ or 200.0
            end
        end

        SetEntityCoords(ent, x, y, chao, false, false, false, false)
        if direcao then SetEntityHeading(ent, direcao + 0.0) end
        if ent ~= ped then SetVehicleOnGroundProperly(ent) end
        FreezeEntityPosition(ent, false)
        Wait(50)
        DoScreenFadeIn(300)

        if Camera and Camera.ativa then Camera.enquadrarPersonagem() end
        teleportando = false
    end)
end
