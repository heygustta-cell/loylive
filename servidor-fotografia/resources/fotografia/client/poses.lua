-- Poses (cenários e animações), congelar pose, girar o personagem e expressões do rosto.

Poses = { atual = nil, congelada = false, expressao = '' }

function Poses.tocar(p)
    local ped = PlayerPedId()
    if IsPedInAnyVehicle(ped, false) then
        Notificar('Saia do veículo para fazer poses.')
        return false
    end
    ClearPedTasks(ped)
    Poses.congelada = false

    if p.cenario then
        TaskStartScenarioInPlace(ped, p.cenario, 0, true)
    else
        if not CarregarAnimDict(p.dict) then
            Notificar(('Animação não encontrada: %s'):format(tostring(p.dict)))
            return false
        end
        TaskPlayAnim(ped, p.dict, p.anim, 4.0, 4.0, -1, Inteiro(p.flag, 1), 0.0, false, false, false)
    end
    Poses.atual = p
    return true
end

function Poses.parar()
    local ped = PlayerPedId()
    if Poses.atual and Poses.atual.cenario then
        ClearPedTasksImmediately(ped)
    else
        ClearPedTasks(ped)
    end
    Poses.atual = nil
    Poses.congelada = false
end

function Poses.congelar(ativo)
    local p = Poses.atual
    if not p or p.cenario then
        Notificar('Congelar funciona com animações (as poses com "dict"), não com cenários.')
        Poses.congelada = false
        return
    end
    SetEntityAnimSpeed(PlayerPedId(), p.dict, p.anim, ativo and 0.0 or 1.0)
    Poses.congelada = ativo == true
end

function Poses.expressar(id)
    local ped = PlayerPedId()
    if type(id) ~= 'string' or id == '' then
        ClearFacialIdleAnimOverride(ped)
        Poses.expressao = ''
    else
        SetFacialIdleAnimOverride(ped, id, 0)
        Poses.expressao = id
    end
end

function Poses.porComando(cmd)
    cmd = tostring(cmd or ''):lower()
    for _, p in ipairs(Config.Poses) do
        if p.cmd == cmd then return p end
    end
    return nil
end

function Poses.estadoUI()
    return {
        atual = Poses.atual and Poses.atual.nome or '',
        congelada = Poses.congelada,
        rotacao = math.floor(GetEntityHeading(PlayerPedId())),
        expressao = Poses.expressao,
    }
end

function Poses.comandoUI(d)
    local acao = d.acao
    if acao == 'tocar' then
        local p = Config.Poses[Inteiro(d.indice, 0)]
        if p then Poses.tocar(p) end
    elseif acao == 'parar' then
        Poses.parar()
    elseif acao == 'congelar' then
        Poses.congelar(d.valor == true)
    elseif acao == 'rotacao' then
        local ped = PlayerPedId()
        if not IsPedInAnyVehicle(ped, false) then SetEntityHeading(ped, Numero(d.valor) % 360.0) end
    elseif acao == 'expressao' then
        Poses.expressar(d.valor)
    elseif acao == 'personalizada' then
        local dict, anim = tostring(d.dict or ''), tostring(d.anim or '')
        if dict ~= '' and anim ~= '' then
            Poses.tocar({ nome = dict .. ' / ' .. anim, dict = dict, anim = anim, flag = Inteiro(d.flag, 1) })
        end
    end
    return { poses = Poses.estadoUI() }
end
