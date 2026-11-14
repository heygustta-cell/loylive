-- Veículos: criar, pintar, rodas, neon, faróis, portas, tunagem e mais.
-- O painel edita o carro em que você está, ou o último que você criou/usou.

Veiculo = { ultimo = nil, farol = 0, acabamento = 0, congelados = {} }

local PORTAS = { 'Motorista', 'Passageiro', 'Traseira esq.', 'Traseira dir.', 'Capô', 'Porta-malas' }

local function controlar(v)
    if NetworkHasControlOfEntity(v) then return true end
    NetworkRequestControlOfEntity(v)
    local limite = GetGameTimer() + 1500
    while not NetworkHasControlOfEntity(v) and GetGameTimer() < limite do
        Wait(0)
        NetworkRequestControlOfEntity(v)
    end
    return NetworkHasControlOfEntity(v)
end

local function temOutroJogadorDentro(v)
    local meu = PlayerPedId()
    for s = -1, GetVehicleMaxNumberOfPassengers(v) - 1 do
        local p = GetPedInVehicleSeat(v, s)
        if p ~= 0 and p ~= meu and IsPedAPlayer(p) then return true end
    end
    return false
end

local function apagar(v)
    if not v or v == 0 or not DoesEntityExist(v) then return end
    if temOutroJogadorDentro(v) then return end
    controlar(v)
    SetEntityAsMissionEntity(v, true, true)
    DeleteVehicle(v)
end

function Veiculo.alvo()
    local ped = PlayerPedId()
    local v = GetVehiclePedIsIn(ped, false)
    if v ~= 0 then return v end
    if Veiculo.ultimo and DoesEntityExist(Veiculo.ultimo) then return Veiculo.ultimo end
    v = GetVehiclePedIsIn(ped, true)
    if v ~= 0 and DoesEntityExist(v) then return v end
    return nil
end

function Veiculo.criar(modelo)
    modelo = tostring(modelo or ''):lower():gsub('[^%w_]', '')
    local hash = GetHashKey(modelo)
    if modelo == '' or not IsModelInCdimage(hash) or not IsModelAVehicle(hash) then
        Notificar(('O veículo "%s" não existe nesta versão do jogo.'):format(modelo))
        return false
    end
    if not CarregarModelo(hash) then
        Notificar('O veículo demorou demais para carregar. Tente de novo.')
        return false
    end

    local ped = PlayerPedId()
    local atual = GetVehiclePedIsIn(ped, false)
    if atual ~= 0 and atual == Veiculo.ultimo then apagar(atual) end
    if Config.ApagarVeiculoAnterior and Veiculo.ultimo and DoesEntityExist(Veiculo.ultimo) then apagar(Veiculo.ultimo) end

    local pos = GetEntityCoords(ped)
    local v = CreateVehicle(hash, pos.x, pos.y, pos.z + 0.5, GetEntityHeading(ped), true, false)
    SetModelAsNoLongerNeeded(hash)
    if v == 0 then
        Notificar('Não consegui criar o veículo.')
        return false
    end
    SetEntityAsMissionEntity(v, true, true)
    SetVehicleOnGroundProperly(v)
    SetVehicleHasBeenOwnedByPlayer(v, true)
    SetVehicleNeedsToBeHotwired(v, false)
    SetVehicleDirtLevel(v, 0.0)
    SetVehicleNumberPlateText(v, Config.Placa)
    SetVehicleModKit(v, 0)
    SetVehRadioStation(v, 'OFF')
    SetPedIntoVehicle(ped, v, -1)
    Veiculo.ultimo = v
    Veiculo.farol, Veiculo.acabamento = 0, 0
    return true
end

-- Cores de xenon: os nomes das funções mudaram entre versões, então tentamos as duas
local function definirCorXenon(v, indice)
    local fn = SetVehicleXenonLightsColor or SetVehicleXenonLightsColour or SetVehicleXenonLightColorIndex
    if fn then
        pcall(fn, v, indice)
    else
        pcall(Citizen.InvokeNative, 0xE41033B25D003A07, v, indice)
    end
end

local function lerCorXenon(v)
    local fn = GetVehicleXenonLightsColor or GetVehicleXenonLightsColour or GetVehicleXenonLightColorIndex
    if not fn then return 255 end
    local ok, cor = pcall(fn, v)
    return (ok and type(cor) == 'number') and cor or 255
end

local function lerLivery(v)
    local total = GetVehicleLiveryCount(v)
    if total and total > 0 then
        return { valor = GetVehicleLivery(v), min = 0, max = total - 1, tipo = 'livery' }
    end
    total = GetNumVehicleMods(v, 48)
    if total > 0 then
        return { valor = GetVehicleMod(v, 48), min = -1, max = total - 1, tipo = 'mod' }
    end
    return { valor = 0, min = 0, max = 0, tipo = 'nenhum' }
end

local function nomeDoModelo(v)
    local codigo = GetDisplayNameFromVehicleModel(GetEntityModel(v))
    local nome = GetLabelText(codigo)
    if not nome or nome == 'NULL' then return codigo end
    return nome
end

function Veiculo.estadoUI()
    local v = Veiculo.alvo()
    if not v then return { existe = false } end
    SetVehicleModKit(v, 0)

    local r1, g1, b1 = GetVehicleCustomPrimaryColour(v)
    local r2, g2, b2 = GetVehicleCustomSecondaryColour(v)
    local perolado, corRodas = GetVehicleExtraColours(v)
    local nr, ng, nb = GetVehicleNeonLightsColour(v)
    local neon = false
    for i = 0, 3 do
        if IsVehicleNeonLightEnabled(v, i) then neon = true end
    end
    local portas = {}
    for i = 0, 5 do
        if GetIsDoorValid(v, i) then
            portas[#portas + 1] = { indice = i, nome = PORTAS[i + 1], aberta = GetVehicleDoorAngleRatio(v, i) > 0.05 }
        end
    end
    local livery = lerLivery(v)

    return {
        existe = true,
        nome = nomeDoModelo(v),
        dentro = GetVehiclePedIsIn(PlayerPedId(), false) == v,
        primaria = { r = r1, g = g1, b = b1 },
        secundaria = { r = r2, g = g2, b = b2 },
        acabamento = Veiculo.acabamento,
        perolado = perolado,
        corRodas = corRodas,
        vidro = math.max(GetVehicleWindowTint(v), 0),
        sujeira = GetVehicleDirtLevel(v),
        neon = neon,
        neonCor = { r = nr, g = ng, b = nb },
        xenon = IsToggleModOn(v, 22),
        xenonCor = lerCorXenon(v),
        farol = Veiculo.farol,
        motor = GetIsVehicleEngineRunning(v),
        congelado = Veiculo.congelados[v] == true,
        tipoRodas = GetVehicleWheelType(v),
        rodas = GetVehicleMod(v, 23),
        maxRodas = GetNumVehicleMods(v, 23) - 1,
        livery = livery.valor,
        liveryMin = livery.min,
        liveryMax = livery.max,
        placa = (GetVehicleNumberPlateText(v) or ''):gsub('^%s+', ''):gsub('%s+$', ''),
        estiloPlaca = GetVehicleNumberPlateTextIndex(v),
        portas = portas,
    }
end

local function tunar(v)
    for tipo = 0, 49 do
        if tipo ~= 23 and tipo ~= 24 and tipo ~= 48 and (tipo < 17 or tipo > 22) then
            local total = GetNumVehicleMods(v, tipo)
            if total > 0 then SetVehicleMod(v, tipo, total - 1, false) end
        end
    end
    ToggleVehicleMod(v, 18, true)
    ToggleVehicleMod(v, 22, true)
end

local function deFabrica(v)
    for tipo = 0, 49 do RemoveVehicleMod(v, tipo) end
    ToggleVehicleMod(v, 18, false)
    ToggleVehicleMod(v, 22, false)
end

local function aplicarFarol(v, modo)
    Veiculo.farol = modo
    if modo == 1 then
        SetVehicleLights(v, 1)
        SetVehicleFullbeam(v, false)
    elseif modo >= 2 then
        SetVehicleEngineOn(v, true, true, false)
        SetVehicleLights(v, 2)
        SetVehicleFullbeam(v, modo == 3)
    else
        SetVehicleLights(v, 0)
        SetVehicleFullbeam(v, false)
    end
end

local function cor(d)
    return Limitar(Inteiro(d.r), 0, 255), Limitar(Inteiro(d.g), 0, 255), Limitar(Inteiro(d.b), 0, 255)
end

function Veiculo.comandoUI(d)
    local acao = d.acao
    if acao == 'criar' then
        Veiculo.criar(d.modelo)
        return { veiculo = Veiculo.estadoUI(), rerender = true }
    elseif acao == 'atualizar' then
        return { veiculo = Veiculo.estadoUI(), rerender = true }
    end

    local v = Veiculo.alvo()
    if not v then return { veiculo = { existe = false }, rerender = true } end

    if acao == 'apagar' then
        apagar(v)
        if Veiculo.ultimo == v then Veiculo.ultimo = nil end
        return { veiculo = Veiculo.estadoUI(), rerender = true }
    elseif acao == 'entrar' then
        SetPedIntoVehicle(PlayerPedId(), v, -1)
        return { veiculo = Veiculo.estadoUI(), rerender = true }
    end

    if not controlar(v) then
        Notificar('Este veículo é de outro jogador; não consigo editar agora.')
        return {}
    end
    SetVehicleModKit(v, 0)

    if acao == 'cor' then
        local r, g, b = cor(d)
        if d.qual == 'secundaria' then
            SetVehicleCustomSecondaryColour(v, r, g, b)
        else
            SetVehicleCustomPrimaryColour(v, r, g, b)
        end
    elseif acao == 'acabamento' then
        local tipo = Circular(Inteiro(d.valor), 0, 5)
        local r1, g1, b1 = GetVehicleCustomPrimaryColour(v)
        local r2, g2, b2 = GetVehicleCustomSecondaryColour(v)
        local perolado, corRodas = GetVehicleExtraColours(v)
        SetVehicleModColor_1(v, tipo, 0, 0)
        SetVehicleModColor_2(v, tipo, 0)
        SetVehicleCustomPrimaryColour(v, r1, g1, b1)
        SetVehicleCustomSecondaryColour(v, r2, g2, b2)
        SetVehicleExtraColours(v, perolado, corRodas)
        Veiculo.acabamento = tipo
    elseif acao == 'perolado' or acao == 'corRodas' then
        local perolado, corRodas = GetVehicleExtraColours(v)
        local valor = Circular(Inteiro(d.valor), 0, 160)
        if acao == 'perolado' then perolado = valor else corRodas = valor end
        SetVehicleExtraColours(v, perolado, corRodas)
    elseif acao == 'vidro' then
        SetVehicleWindowTint(v, Circular(Inteiro(d.valor), 0, 6))
    elseif acao == 'sujeira' then
        SetVehicleDirtLevel(v, Limitar(Numero(d.valor), 0.0, 15.0))
    elseif acao == 'neon' then
        for i = 0, 3 do SetVehicleNeonLightEnabled(v, i, d.valor == true) end
    elseif acao == 'neonCor' then
        SetVehicleNeonLightsColour(v, cor(d))
    elseif acao == 'xenon' then
        ToggleVehicleMod(v, 22, d.valor == true)
    elseif acao == 'xenonCor' then
        ToggleVehicleMod(v, 22, true)
        definirCorXenon(v, Inteiro(d.valor, 255))
    elseif acao == 'farol' then
        aplicarFarol(v, Circular(Inteiro(d.valor), 0, 3))
    elseif acao == 'motor' then
        SetVehicleEngineOn(v, d.valor == true, true, true)
    elseif acao == 'porta' then
        local i = Inteiro(d.indice)
        if GetVehicleDoorAngleRatio(v, i) > 0.05 then
            SetVehicleDoorShut(v, i, false)
        else
            SetVehicleDoorOpen(v, i, false, false)
        end
    elseif acao == 'portasTodas' then
        for i = 0, 5 do
            if d.valor == true then SetVehicleDoorOpen(v, i, false, false) else SetVehicleDoorShut(v, i, false) end
        end
    elseif acao == 'tunar' then
        tunar(v)
        Notificar('Tunado no máximo!')
    elseif acao == 'original' then
        deFabrica(v)
        Notificar('Peças de fábrica.')
    elseif acao == 'reparar' then
        SetVehicleFixed(v)
        SetVehicleDeformationFixed(v)
        SetVehicleEngineHealth(v, 1000.0)
    elseif acao == 'lavar' then
        SetVehicleDirtLevel(v, 0.0)
        WashDecalsFromVehicle(v, 1.0)
    elseif acao == 'tipoRodas' then
        SetVehicleWheelType(v, Circular(Inteiro(d.valor), 0, 12))
        SetVehicleMod(v, 23, 0, false)
        if IsThisModelABike(GetEntityModel(v)) then SetVehicleMod(v, 24, 0, false) end
    elseif acao == 'rodas' then
        local total = GetNumVehicleMods(v, 23)
        local indice = Circular(Inteiro(d.valor, -1), -1, total - 1)
        SetVehicleMod(v, 23, indice, false)
        if IsThisModelABike(GetEntityModel(v)) then SetVehicleMod(v, 24, indice, false) end
    elseif acao == 'livery' then
        local l = lerLivery(v)
        local valor = Circular(Inteiro(d.valor), l.min, l.max)
        if l.tipo == 'livery' then SetVehicleLivery(v, valor) elseif l.tipo == 'mod' then SetVehicleMod(v, 48, valor, false) end
    elseif acao == 'placa' then
        local texto = tostring(d.valor or ''):upper():gsub('[^%w ]', ''):sub(1, 8)
        SetVehicleNumberPlateText(v, texto)
    elseif acao == 'estiloPlaca' then
        SetVehicleNumberPlateTextIndex(v, Circular(Inteiro(d.valor), 0, 5))
    elseif acao == 'congelar' then
        FreezeEntityPosition(v, d.valor == true)
        Veiculo.congelados[v] = d.valor == true or nil
    end
    return { veiculo = Veiculo.estadoUI() }
end
