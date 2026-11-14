-- Servidor: clima e horário compartilhados por todo mundo.
-- O estado fica em GlobalState.fotoAmbiente e chega automaticamente em todos os jogadores.

local Amb = AmbientePadrao()

local function publicar()
    GlobalState.fotoAmbiente = CopiarTabela(Amb)
end

publicar()

RegisterNetEvent('fotografia:ambiente', function(mudancas)
    local src = source
    if Config.Ambiente.SoAdminPodeMudar and not EhAdmin(src) then
        Avisar(src, 'Só administradores podem mudar o clima e a hora de todos. Use "Só pra mim" no painel.')
        return
    end
    local ok = ValidarMudancasAmbiente(mudancas)
    local mudou = false
    for campo, valor in pairs(ok) do
        Amb[campo] = valor
        mudou = true
    end
    if mudou then publicar() end
end)

-- Relógio do servidor (só anda se a hora não estiver congelada)
CreateThread(function()
    while true do
        Wait(Config.Ambiente.MsPorMinuto)
        if not Amb.congelado then
            AvancarRelogio(Amb)
            publicar()
        end
    end
end)
