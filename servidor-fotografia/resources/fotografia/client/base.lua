-- Entrada no servidor (spawn), proteções (ninguém morre, sem polícia) e limpeza.

local iniciado = false
local boasVindasMostradas = false
local invalidarCameraParada = Nativa('InvalidateIdleCam')
local invalidarCameraParadaVeiculo = Nativa('InvalidateVehicleIdleCam', 'InvalidateCinematicVehicleIdleMode')

local function iniciar()
    if iniciado then return end
    iniciado = true
    CreateThread(function()
        Permissoes = ChamarServidor('permissoes') or { ambiente = true }
        Personagem.salva = ChamarServidor('carregarLook')
        Personagem.atualizarLooks()

        exports.spawnmanager:setAutoSpawnCallback(function()
            local s = Config.Spawn
            local modelo = Config.ModeloPadrao
            local salva = Personagem.salva
            if salva and type(salva.modelo) == 'string' and IsModelInCdimage(GetHashKey(salva.modelo)) then
                modelo = salva.modelo
            end
            exports.spawnmanager:spawnPlayer({ x = s.x, y = s.y, z = s.z, heading = s.w, model = modelo, skipFade = false })
        end)
        exports.spawnmanager:setAutoSpawn(true)

        if LocalPlayer.state.fotografiaSpawnou then
            -- O recurso foi reiniciado com o jogador já dentro: só restaura o visual
            Personagem.aplicarSalva()
        else
            exports.spawnmanager:forceRespawn()
        end
    end)
end

-- O mapmanager avisa quando o modo de jogo começa
AddEventHandler('onClientGameTypeStart', function(recurso)
    if recurso == GetCurrentResourceName() then iniciar() end
end)

-- Garantia: se o mapmanager não estiver rodando, começa assim mesmo
AddEventHandler('onClientResourceStart', function(recurso)
    if recurso == GetCurrentResourceName() then SetTimeout(4000, iniciar) end
end)

AddEventHandler('playerSpawned', function()
    LocalPlayer.state:set('fotografiaSpawnou', true, false)
    RemoveAllPedWeapons(PlayerPedId(), true)
    Personagem.aplicarSalva()
    if not boasVindasMostradas then
        boasVindasMostradas = true
        Notificar(('Bem-vindo ao ~y~%s~s~! ~y~%s~s~ abre o painel, ~y~%s~s~ liga a câmera. Ajuda: ~y~/fotoajuda'):format(
            Config.NomeServidor, Config.Teclas.Painel, Config.Teclas.Camera))
    end
end)

-- Proteções: invencível, sem polícia, NPCs ignoram você, câmera "parada" do GTA não liga sozinha
CreateThread(function()
    for i = 1, 15 do EnableDispatchService(i, false) end
    while true do
        local jogador, ped = PlayerId(), PlayerPedId()
        SetPlayerInvincible(jogador, true)
        SetEntityInvincible(ped, true)
        SetMaxWantedLevel(0)
        if GetPlayerWantedLevel(jogador) > 0 then ClearPlayerWantedLevel(jogador) end
        SetPoliceIgnorePlayer(jogador, true)
        SetEveryoneIgnorePlayer(jogador, true)
        SetPlayerCanBeHassledByGangs(jogador, false)
        if Config.DesativarAtaques then
            SetCanAttackFriendly(ped, false, false)
            NetworkSetFriendlyFireOption(false)
        end
        if invalidarCameraParada then invalidarCameraParada() end
        if invalidarCameraParadaVeiculo then invalidarCameraParadaVeiculo() end
        Wait(1000)
    end
end)

if Config.DesativarAtaques then
    CreateThread(function()
        while true do
            DisablePlayerFiring(PlayerId(), true)
            DisableControlAction(0, 24, true)  -- atacar
            DisableControlAction(0, 140, true) -- soco leve
            DisableControlAction(0, 141, true) -- soco forte
            DisableControlAction(0, 142, true) -- soco alternativo
            DisableControlAction(0, 257, true) -- atacar 2
            DisableControlAction(0, 263, true) -- corpo a corpo
            DisableControlAction(0, 264, true) -- corpo a corpo 2
            Wait(0)
        end
    end)
end

AddEventHandler('onResourceStop', function(recurso)
    if recurso ~= GetCurrentResourceName() then return end
    if Camera.ativa then
        RenderScriptCams(false, false, 0, true, false)
        if Camera.cam then DestroyCam(Camera.cam, false) end
        ClearFocus()
    end
    ClearTimecycleModifier()
    ClearExtraTimecycleModifier()
    SetArtificialLightsState(false)
    SetNuiFocus(false, false)
end)
