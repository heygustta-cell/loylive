-- Clima, horário, céu, vento, apagão e quantidade de NPCs.
-- Normalmente segue o servidor (todo mundo vê igual). Com "Só pra mim" ativo, cada um controla o seu.

Ambiente = {
    global = GlobalState.fotoAmbiente,
    localAtivo = false,
    localEstado = nil,
}

local aplicado = {}

function Ambiente.atual()
    if Ambiente.localAtivo and Ambiente.localEstado then return Ambiente.localEstado end
    return Ambiente.global
end

local function aplicarClima(clima)
    ClearOverrideWeather()
    ClearWeatherTypePersist()
    SetWeatherTypePersist(clima)
    SetWeatherTypeNow(clima)
    SetWeatherTypeNowPersist(clima)
    local neve = clima == 'XMAS'
    SetForceVehicleTrails(neve)
    SetForcePedFootstepsTracks(neve)
end

local function aplicarNuvens(nome, opacidade)
    ClearCloudHat()
    if nome and nome ~= '' then LoadCloudHat(nome, 0.5) end
    if SetCloudsAlpha then pcall(SetCloudsAlpha, (opacidade or 1.0) + 0.0) end
end

CreateThread(function()
    while true do
        if not Ambiente.global then Ambiente.global = GlobalState.fotoAmbiente end
        local a = Ambiente.atual()
        if a then
            if aplicado.clima ~= a.clima then
                aplicarClima(a.clima)
                aplicado.clima = a.clima
                aplicado.nuvens, aplicado.vento = nil, nil
            end
            if aplicado.nuvens ~= a.nuvens or aplicado.opacidadeNuvens ~= a.opacidadeNuvens then
                aplicarNuvens(a.nuvens, a.opacidadeNuvens)
                aplicado.nuvens, aplicado.opacidadeNuvens = a.nuvens, a.opacidadeNuvens
            end
            if aplicado.vento ~= a.vento then
                if a.vento and a.vento >= 0.0 then
                    SetWindSpeed(a.vento + 0.0)
                elseif aplicado.vento and aplicado.vento >= 0.0 then
                    aplicado.clima = nil -- voltou para "automático": reaplica o clima para recuperar o vento dele
                end
                aplicado.vento = a.vento
            end
            if aplicado.apagao ~= a.apagao then
                SetArtificialLightsState(a.apagao == true)
                SetArtificialLightsStateAffectsVehicles(false)
                aplicado.apagao = a.apagao
            end

            NetworkOverrideClockTime(math.floor(a.hora), math.floor(a.minuto), 0)

            local t, p = (a.trafego or 1.0) + 0.0, (a.pedestres or 1.0) + 0.0
            SetVehicleDensityMultiplierThisFrame(t)
            SetRandomVehicleDensityMultiplierThisFrame(t)
            SetParkedVehicleDensityMultiplierThisFrame(t)
            SetPedDensityMultiplierThisFrame(p)
            SetScenarioPedDensityMultiplierThisFrame(p, p)
            if aplicado.trafego ~= t then
                SetRandomBoats(t > 0.0)
                SetGarbageTrucks(t > 0.0)
                SetRandomTrains(t > 0.0)
                aplicado.trafego = t
            end
        end
        Wait(0)
    end
end)

-- Relógio do modo "Só pra mim"
CreateThread(function()
    while true do
        Wait(Config.Ambiente.MsPorMinuto)
        local l = Ambiente.localEstado
        if Ambiente.localAtivo and l and not l.congelado then
            AvancarRelogio(l)
            if Painel then Painel.enviar('ambiente', Ambiente.estadoUI()) end
        end
    end
end)

AddStateBagChangeHandler('fotoAmbiente', 'global', function(_, _, valor)
    Ambiente.global = valor
    if not Ambiente.localAtivo and Painel then Painel.enviar('ambiente', Ambiente.estadoUI()) end
end)

function Ambiente.podeMudarGlobal()
    return Permissoes == nil or Permissoes.ambiente ~= false
end

-- Muda clima/hora/etc. Recebe uma tabela, ex.: { clima = 'RAIN' } ou { hora = 6, minuto = 30 }
function Ambiente.mudar(mudancas)
    local ok = ValidarMudancasAmbiente(mudancas)
    if next(ok) == nil then return false end
    if Ambiente.localAtivo then
        for campo, valor in pairs(ok) do Ambiente.localEstado[campo] = valor end
        return true
    end
    if not Ambiente.podeMudarGlobal() then
        Notificar('Só admins mudam o ambiente de todos. Ative ~y~Só pra mim~s~ no painel.')
        return false
    end
    TriggerServerEvent('fotografia:ambiente', ok)
    return true
end

function Ambiente.definirLocal(ativo)
    Ambiente.localAtivo = ativo == true
    if Ambiente.localAtivo then
        Ambiente.localEstado = CopiarTabela(Ambiente.global or AmbientePadrao())
    end
end

function Ambiente.limparArea()
    local p = (Camera and Camera.ativa) and Camera.pos or GetEntityCoords(PlayerPedId())
    local raio = 150.0
    ClearAreaOfPeds(p.x, p.y, p.z, raio, 1)
    ClearAreaOfVehicles(p.x, p.y, p.z, raio, false, false, false, false, false)
    RemoveVehiclesFromGeneratorsInArea(p.x - raio, p.y - raio, p.z - raio, p.x + raio, p.y + raio, p.z + raio)
    Notificar('NPCs e carros parados por perto foram removidos.')
end

function Ambiente.estadoUI()
    local e = CopiarTabela(Ambiente.atual() or AmbientePadrao())
    e.soPraMim = Ambiente.localAtivo
    e.podeMudar = Ambiente.podeMudarGlobal()
    return e
end

function Ambiente.comandoUI(d)
    local acao = d.acao
    if acao == 'definir' and type(d.campo) == 'string' then
        Ambiente.mudar({ [d.campo] = d.valor })
    elseif acao == 'horario' then
        Ambiente.mudar({ hora = d.hora, minuto = d.minuto })
    elseif acao == 'soPraMim' then
        Ambiente.definirLocal(d.valor == true)
        return { ambiente = Ambiente.estadoUI(), rerender = true }
    elseif acao == 'limparArea' then
        Ambiente.limparArea()
        return {}
    end
    -- No modo global a resposta chega pelo GlobalState (evita "piscar" o painel)
    if Ambiente.localAtivo then return { ambiente = Ambiente.estadoUI() } end
    return {}
end
