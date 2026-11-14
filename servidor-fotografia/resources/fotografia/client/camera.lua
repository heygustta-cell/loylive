-- Câmera livre de fotografia: voa pelo mapa, zoom, inclinação, profundidade de campo (foco),
-- guias de enquadramento (terços e proporções de Instagram/cinema) e interface que some com H.

Camera = {
    ativa = false,
    cam = nil,
    sessao = 0,
    pos = vector3(0.0, 0.0, 0.0),
    rot = vector3(0.0, 0.0, 0.0), -- x = inclinação, z = direção
    fov = 50.0,
    fovAlvo = 50.0,
    roll = 0.0,                   -- inclinação lateral (ângulo holandês)
    velocidade = 1.0,
    tremor = 0.0,
    dof = { ativo = false, foco = 5.0, focoAlvo = 5.0, profundidade = 3.0, intensidade = 1.0, continuo = false },
    grade = false,
    proporcao = 'livre',
    barrasSolidas = true,
    ocultarEu = false,
    ocultarOutros = false,
    limpo = false,                -- H: esconde ajuda, grade, informações e marcadores
    mostrarInfo = true,
}

local PROPORCOES = {
    ['1:1'] = 1.0,
    ['4:5'] = 0.8,
    ['9:16'] = 9.0 / 16.0,
    ['3:2'] = 1.5,
    ['16:9'] = 16.0 / 9.0,
    ['2.39:1'] = 2.39,
}

-- Controles que continuam funcionando com a câmera ligada: pausa, ESC, chat e falar
local CONTROLES_LIBERADOS = { 199, 200, 245, 249 }

local usandoTeclado = IsUsingKeyboardAndMouse or IsUsingKeyboard

local function equivalenteMm(fov)
    return 12.0 / math.tan(math.rad(fov) / 2.0)
end

-- ------------------------------------------------------------------ desenho na tela
local function texto(str, x, y, escala)
    SetTextFont(4)
    SetTextScale(0.0, escala)
    SetTextColour(255, 255, 255, 225)
    SetTextDropShadow()
    SetTextOutline()
    BeginTextCommandDisplayText('STRING')
    AddTextComponentSubstringPlayerName(str)
    EndTextCommandDisplayText(x, y)
end

-- Área visível depois das barras de proporção (x0, y0, x1, y1 normalizados)
local function areaUtil()
    local tela = GetAspectRatio(false)
    local alvo = PROPORCOES[Camera.proporcao]
    if not alvo then return 0.0, 0.0, 1.0, 1.0 end
    if alvo < tela then
        local x0 = (1.0 - alvo / tela) / 2.0
        return x0, 0.0, 1.0 - x0, 1.0
    end
    local y0 = (1.0 - tela / alvo) / 2.0
    return 0.0, y0, 1.0, 1.0 - y0
end

local function desenharGuias()
    local x0, y0, x1, y1 = areaUtil()
    local alfa = Camera.barrasSolidas and 255 or 150
    if x0 > 0.0005 then
        DrawRect(x0 / 2.0, 0.5, x0, 1.0, 0, 0, 0, alfa)
        DrawRect(1.0 - x0 / 2.0, 0.5, x0, 1.0, 0, 0, 0, alfa)
    end
    if y0 > 0.0005 then
        DrawRect(0.5, y0 / 2.0, 1.0, y0, 0, 0, 0, alfa)
        DrawRect(0.5, 1.0 - y0 / 2.0, 1.0, y0, 0, 0, 0, alfa)
    end
    if Camera.grade and not Camera.limpo then
        local w, h = x1 - x0, y1 - y0
        local lx = 0.0008
        local ly = lx * GetAspectRatio(false)
        for i = 1, 2 do
            DrawRect(x0 + w * i / 3.0, y0 + h / 2.0, lx, h, 255, 255, 255, 120)
            DrawRect(x0 + w / 2.0, y0 + h * i / 3.0, w, ly, 255, 255, 255, 120)
        end
    end
end

local function desenharInfo()
    local x0, y0 = areaUtil()
    local x, y = x0 + 0.012, y0 + 0.012
    texto(('Lente %.0f mm   |   FOV %.0f   |   Inclinação %.0f   |   Velocidade %.1fx'):format(
        equivalenteMm(Camera.fov), Camera.fov, Camera.roll, Camera.velocidade), x, y, 0.32)
    if Camera.dof.ativo then
        texto(('Foco %.1f m   |   Área nítida %.1f m%s'):format(Camera.dof.foco, Camera.dof.profundidade,
            Camera.dof.continuo and '   |   foco contínuo' or ''), x, y + 0.024, 0.32)
        local a = GetAspectRatio(false)
        DrawRect(0.5, 0.5, 0.003, 0.003 * a, 255, 190, 80, 230)
    end
end

-- Barra de botões do GTA (canto inferior direito)
local function criarAjuda()
    local sf = RequestScaleformMovie('instructional_buttons')
    local limite = GetGameTimer() + 3000
    while not HasScaleformMovieLoaded(sf) and GetGameTimer() < limite do Wait(0) end
    if not HasScaleformMovieLoaded(sf) then return nil end

    local function tecla(c) return GetControlInstructionalButton(0, c, true) end
    local itens = {
        { { 't_' .. Config.Teclas.Camera }, 'Sair' },
        { { 't_' .. Config.Teclas.Painel }, 'Painel' },
        { { tecla(74) }, 'Ocultar interface' },
        { { tecla(182) }, 'Luz aqui' },
        { { tecla(47) }, 'Grade' },
        { { tecla(23) }, 'Focar' },
        { { tecla(20), tecla(26) }, 'Inclinar' },
        { { tecla(241), tecla(242) }, 'Zoom' },
        { { tecla(21), tecla(19) }, 'Rápido / lento' },
        { { tecla(22), tecla(36) }, 'Subir / descer' },
    }

    BeginScaleformMovieMethod(sf, 'CLEAR_ALL')
    EndScaleformMovieMethod()
    BeginScaleformMovieMethod(sf, 'SET_CLEAR_SPACE')
    ScaleformMovieMethodAddParamInt(200)
    EndScaleformMovieMethod()
    for i, item in ipairs(itens) do
        BeginScaleformMovieMethod(sf, 'SET_DATA_SLOT')
        ScaleformMovieMethodAddParamInt(i - 1)
        for _, botao in ipairs(item[1]) do ScaleformMovieMethodAddParamPlayerNameString(botao) end
        BeginTextCommandScaleformString('STRING')
        AddTextComponentSubstringKeyboardDisplay(item[2])
        EndTextCommandScaleformString()
        EndScaleformMovieMethod()
    end
    BeginScaleformMovieMethod(sf, 'DRAW_INSTRUCTIONAL_BUTTONS')
    EndScaleformMovieMethod()
    BeginScaleformMovieMethod(sf, 'SET_BACKGROUND_COLOUR')
    ScaleformMovieMethodAddParamInt(0)
    ScaleformMovieMethodAddParamInt(0)
    ScaleformMovieMethodAddParamInt(0)
    ScaleformMovieMethodAddParamInt(80)
    EndScaleformMovieMethod()
    return sf
end

-- ------------------------------------------------------------------ foco
local ultimoFocoAuto = 0

function Camera.focarCentro(avisar)
    local origem = Camera.pos
    local destino = origem + DirecaoDaRotacao(Camera.rot) * 1500.0
    local ignorar = Camera.ocultarEu and PlayerPedId() or 0
    local teste = StartExpensiveSynchronousShapeTestLosProbe(origem.x, origem.y, origem.z, destino.x, destino.y, destino.z, -1, ignorar, 7)
    local _, acertou, ponto = GetShapeTestResult(teste)
    if acertou == true or acertou == 1 then
        Camera.dof.focoAlvo = Limitar(#(ponto - origem), 0.3, 1000.0)
        if not Camera.dof.ativo then
            Camera.dof.ativo = true
            Camera.dof.foco = Camera.dof.focoAlvo
        end
        if avisar then Notificar(('Foco em ~y~%.1f m'):format(Camera.dof.focoAlvo)) end
        return true
    end
    if avisar then Notificar('Nada no centro da tela para focar (céu?).') end
    return false
end

local function aplicarDof(cam)
    local d = Camera.dof
    if d.ativo then
        local meio = d.profundidade * 0.5
        SetCamUseShallowDofMode(cam, true)
        SetCamNearDof(cam, math.max(0.0, d.foco - meio) + 0.0)
        SetCamFarDof(cam, d.foco + meio + 0.0)
        SetCamDofStrength(cam, d.intensidade + 0.0)
    else
        SetCamUseShallowDofMode(cam, false)
        SetCamDofStrength(cam, 0.0)
    end
end

local function aplicarTremor()
    if not Camera.cam then return end
    if Camera.tremor > 0.0 then
        if IsCamShaking(Camera.cam) then
            SetCamShakeAmplitude(Camera.cam, Camera.tremor + 0.0)
        else
            ShakeCam(Camera.cam, 'HAND_SHAKE', Camera.tremor + 0.0)
        end
    else
        StopCamShaking(Camera.cam, true)
    end
end

-- ------------------------------------------------------------------ controle
local function entrada(dt)
    local cfg = Config.Camera
    local teclado = usandoTeclado == nil or usandoTeclado(0)

    -- Olhar (mouse/analógico). Com zoom, gira mais devagar.
    local fatorZoom = Camera.fov / 50.0
    local mx = GetDisabledControlNormal(0, 1)
    local my = GetDisabledControlNormal(0, 2)
    local sens = teclado and cfg.SensibilidadeMouse or (cfg.SensibilidadeControle * dt * 60.0)
    local inclinacao = Limitar(Camera.rot.x - my * sens * fatorZoom, -89.0, 89.0)
    local direcao = (Camera.rot.z - mx * sens * fatorZoom) % 360.0
    Camera.rot = vector3(inclinacao, 0.0, direcao)

    -- Movimento
    local frente = DirecaoDaRotacao(Camera.rot)
    local rz = math.rad(Camera.rot.z)
    local direita = vector3(math.cos(rz), math.sin(rz), 0.0)
    local mf = -GetDisabledControlNormal(0, 31)
    local ml = GetDisabledControlNormal(0, 30)
    local mz = 0.0
    if IsDisabledControlPressed(0, 22) or IsDisabledControlPressed(0, 38) then mz = mz + 1.0 end -- Espaço / E
    if IsDisabledControlPressed(0, 36) or IsDisabledControlPressed(0, 44) then mz = mz - 1.0 end -- Ctrl / Q

    local vel = cfg.Velocidade * Camera.velocidade
    if IsDisabledControlPressed(0, 21) then vel = vel * cfg.MultiplicadorRapido end -- Shift
    if IsDisabledControlPressed(0, 19) then vel = vel * cfg.MultiplicadorLento end -- Alt

    local deslocamento = frente * mf + direita * ml + vector3(0.0, 0.0, mz)
    if #deslocamento > 0.001 then
        Camera.pos = Camera.pos + deslocamento * (vel * dt)
    end

    if cfg.DistanciaMaxima and cfg.DistanciaMaxima > 0.0 then
        local centro = GetEntityCoords(PlayerPedId())
        local dif = Camera.pos - centro
        if #dif > cfg.DistanciaMaxima then
            Camera.pos = centro + Normalizar(dif) * cfg.DistanciaMaxima
        end
    end

    -- Zoom: rodinha (passos) ou Page Up / Page Down (contínuo)
    local passo = math.max(0.5, Camera.fovAlvo * 0.08)
    if IsDisabledControlJustPressed(0, 241) or IsDisabledControlJustPressed(0, 15) then
        Camera.fovAlvo = Camera.fovAlvo - passo
    elseif IsDisabledControlJustPressed(0, 242) or IsDisabledControlJustPressed(0, 14) then
        Camera.fovAlvo = Camera.fovAlvo + passo
    end
    if IsDisabledControlPressed(0, 10) then Camera.fovAlvo = Camera.fovAlvo - 20.0 * dt end
    if IsDisabledControlPressed(0, 11) then Camera.fovAlvo = Camera.fovAlvo + 20.0 * dt end
    Camera.fovAlvo = Limitar(Camera.fovAlvo, cfg.FovMin, cfg.FovMax)

    -- Inclinação lateral: Z / C, R zera
    if IsDisabledControlPressed(0, 20) then Camera.roll = Limitar(Camera.roll - 25.0 * dt, -90.0, 90.0) end
    if IsDisabledControlPressed(0, 26) then Camera.roll = Limitar(Camera.roll + 25.0 * dt, -90.0, 90.0) end
    if IsDisabledControlJustPressed(0, 45) then Camera.roll = 0.0 end

    if IsDisabledControlJustPressed(0, 23) then Camera.focarCentro(true) end      -- F
    if IsDisabledControlJustPressed(0, 47) then Camera.grade = not Camera.grade end -- G
    if IsDisabledControlJustPressed(0, 74) then Camera.limpo = not Camera.limpo end -- H
    if IsDisabledControlJustPressed(0, 182) then Luzes.adicionar('spot') end        -- L
end

local function ocultarOutrosJogadores()
    local eu = PlayerId()
    for _, jogador in ipairs(GetActivePlayers()) do
        if jogador ~= eu then SetEntityLocallyInvisible(GetPlayerPed(jogador)) end
    end
end

local function loop(minhaSessao)
    local ajuda = criarAjuda()
    while Camera.ativa and Camera.sessao == minhaSessao do
        local dt = GetFrameTime()
        local cam = Camera.cam

        DisableAllControlActions(0)
        for _, c in ipairs(CONTROLES_LIBERADOS) do EnableControlAction(0, c, true) end
        HideHudAndRadarThisFrame()
        if Camera.limpo then ThefeedHideThisFrame() end

        if not (Painel and Painel.aberto) and not IsPauseMenuActive() then entrada(dt) end

        -- Suaviza zoom e foco
        local k = math.min(1.0, dt * 10.0)
        Camera.fov = Camera.fov + (Camera.fovAlvo - Camera.fov) * k
        if Camera.dof.ativo and Camera.dof.continuo and GetGameTimer() - ultimoFocoAuto > 120 then
            ultimoFocoAuto = GetGameTimer()
            Camera.focarCentro(false)
        end
        Camera.dof.foco = Camera.dof.foco + (Camera.dof.focoAlvo - Camera.dof.foco) * math.min(1.0, dt * 8.0)

        local p = Camera.pos
        SetCamCoord(cam, p.x, p.y, p.z)
        SetCamRot(cam, Camera.rot.x, Camera.roll + 0.0, Camera.rot.z, 2)
        SetCamFov(cam, Camera.fov + 0.0)
        SetFocusPosAndVel(p.x, p.y, p.z, 0.0, 0.0, 0.0)
        aplicarDof(cam)
        if Camera.dof.ativo then SetUseHiDof() end

        if Camera.ocultarEu then SetEntityLocallyInvisible(PlayerPedId()) end
        if Camera.ocultarOutros then ocultarOutrosJogadores() end

        desenharGuias()
        if not Camera.limpo then
            if Camera.mostrarInfo then desenharInfo() end
            if ajuda and not (Painel and Painel.aberto) then
                DrawScaleformMovieFullscreen(ajuda, 255, 255, 255, 255, 0)
            end
        end
        Wait(0)
    end
    if ajuda then SetScaleformMovieAsNoLongerNeeded(ajuda) end
end

-- ------------------------------------------------------------------ liga / desliga
function Camera.ligar()
    if Camera.ativa then return end
    local pos = GetGameplayCamCoord()
    local rot = GetGameplayCamRot(2)
    Camera.pos = pos
    Camera.rot = vector3(rot.x, 0.0, rot.z)
    Camera.fov = GetGameplayCamFov()
    Camera.fovAlvo = Camera.fov
    Camera.cam = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', pos.x, pos.y, pos.z, rot.x, 0.0, rot.z, Camera.fov, false, 2)
    SetCamActive(Camera.cam, true)
    RenderScriptCams(true, true, 350, true, false)
    Camera.ativa = true
    Camera.sessao = Camera.sessao + 1
    aplicarTremor()
    local minhaSessao = Camera.sessao
    CreateThread(function() loop(minhaSessao) end)
end

function Camera.desligar()
    if not Camera.ativa then return end
    Camera.ativa = false
    RenderScriptCams(false, true, 350, true, false)
    if Camera.cam then
        DestroyCam(Camera.cam, false)
        Camera.cam = nil
    end
    ClearFocus()
end

function Camera.alternar()
    if Camera.ativa then Camera.desligar() else Camera.ligar() end
    if Painel then Painel.enviar('camera', Camera.estadoUI(), true) end
end

-- Coloca a câmera na frente do seu personagem, olhando para o rosto (bom para retrato)
function Camera.enquadrarPersonagem()
    if not Camera.ativa then Camera.ligar() end
    local ped = PlayerPedId()
    local rosto = GetPedBoneCoords(ped, 31086, 0.0, 0.0, 0.0)
    local h = math.rad(GetEntityHeading(ped))
    local frente = vector3(-math.sin(h), math.cos(h), 0.0)
    Camera.pos = rosto + frente * 2.2 + vector3(0.0, 0.0, -0.05)
    local inclinacao, direcao = RotacaoDaDirecao(Normalizar(rosto - Camera.pos))
    Camera.rot = vector3(inclinacao, 0.0, direcao)
    Camera.roll = 0.0
    if Camera.dof.ativo then
        Camera.dof.focoAlvo = #(rosto - Camera.pos)
        Camera.dof.foco = Camera.dof.focoAlvo
    end
end

-- ------------------------------------------------------------------ posições salvas (no seu PC)
local CHAVE_SLOTS = 'fotografia:posicoesCamera'
local TOTAL_SLOTS = 3

local function lerSlots()
    local txt = GetResourceKvpString(CHAVE_SLOTS)
    if not txt or txt == '' then return {} end
    local ok, dados = pcall(json.decode, txt)
    return (ok and type(dados) == 'table') and dados or {}
end

function Camera.salvarSlot(n)
    if not Camera.ativa then Notificar('Ligue a câmera para salvar a posição dela.') return end
    local slots = lerSlots()
    slots['s' .. n] = {
        x = Camera.pos.x, y = Camera.pos.y, z = Camera.pos.z,
        rx = Camera.rot.x, rz = Camera.rot.z, roll = Camera.roll, fov = Camera.fovAlvo,
        dof = { ativo = Camera.dof.ativo, foco = Camera.dof.focoAlvo, profundidade = Camera.dof.profundidade, intensidade = Camera.dof.intensidade },
    }
    SetResourceKvp(CHAVE_SLOTS, json.encode(slots))
    Notificar(('Posição %d da câmera salva.'):format(n))
end

function Camera.carregarSlot(n)
    local s = lerSlots()['s' .. n]
    if not s then Notificar(('A posição %d está vazia.'):format(n)) return end
    if not Camera.ativa then Camera.ligar() end
    Camera.pos = vector3(s.x + 0.0, s.y + 0.0, s.z + 0.0)
    Camera.rot = vector3(s.rx + 0.0, 0.0, s.rz + 0.0)
    Camera.roll = (s.roll or 0.0) + 0.0
    Camera.fovAlvo = (s.fov or 50.0) + 0.0
    Camera.fov = Camera.fovAlvo
    if type(s.dof) == 'table' then
        Camera.dof.ativo = s.dof.ativo == true
        Camera.dof.focoAlvo = (s.dof.foco or 5.0) + 0.0
        Camera.dof.foco = Camera.dof.focoAlvo
        Camera.dof.profundidade = (s.dof.profundidade or 3.0) + 0.0
        Camera.dof.intensidade = (s.dof.intensidade or 1.0) + 0.0
    end
end

-- ------------------------------------------------------------------ painel
function Camera.estadoUI()
    local slots, salvos = {}, lerSlots()
    for i = 1, TOTAL_SLOTS do slots[i] = salvos['s' .. i] ~= nil end
    return {
        ativa = Camera.ativa,
        fov = Camera.fovAlvo,
        roll = Camera.roll,
        velocidade = Camera.velocidade,
        tremor = Camera.tremor,
        dof = {
            ativo = Camera.dof.ativo,
            foco = Camera.dof.focoAlvo,
            profundidade = Camera.dof.profundidade,
            intensidade = Camera.dof.intensidade,
            continuo = Camera.dof.continuo,
        },
        grade = Camera.grade,
        proporcao = Camera.proporcao,
        barrasSolidas = Camera.barrasSolidas,
        ocultarEu = Camera.ocultarEu,
        ocultarOutros = Camera.ocultarOutros,
        mostrarInfo = Camera.mostrarInfo,
        slots = slots,
    }
end

local CAMPOS = {
    fov = function(v)
        Camera.fovAlvo = Limitar(Numero(v, 50.0), Config.Camera.FovMin, Config.Camera.FovMax)
        Camera.fov = Camera.fovAlvo
    end,
    roll = function(v) Camera.roll = Limitar(Numero(v), -90.0, 90.0) end,
    velocidade = function(v) Camera.velocidade = Limitar(Numero(v, 1.0), 0.05, 10.0) end,
    tremor = function(v)
        Camera.tremor = Limitar(Numero(v), 0.0, 2.0)
        aplicarTremor()
    end,
    ['dof.ativo'] = function(v) Camera.dof.ativo = v == true end,
    ['dof.continuo'] = function(v) Camera.dof.continuo = v == true end,
    ['dof.foco'] = function(v)
        Camera.dof.focoAlvo = Limitar(Numero(v, 5.0), 0.1, 1000.0)
        Camera.dof.foco = Camera.dof.focoAlvo
    end,
    ['dof.profundidade'] = function(v) Camera.dof.profundidade = Limitar(Numero(v, 3.0), 0.05, 500.0) end,
    ['dof.intensidade'] = function(v) Camera.dof.intensidade = Limitar(Numero(v, 1.0), 0.0, 1.0) end,
    grade = function(v) Camera.grade = v == true end,
    proporcao = function(v) Camera.proporcao = PROPORCOES[v] and v or 'livre' end,
    barrasSolidas = function(v) Camera.barrasSolidas = v == true end,
    ocultarEu = function(v) Camera.ocultarEu = v == true end,
    ocultarOutros = function(v) Camera.ocultarOutros = v == true end,
    mostrarInfo = function(v) Camera.mostrarInfo = v == true end,
}

function Camera.comandoUI(d)
    local acao = d.acao
    if acao == 'alternar' then
        if Camera.ativa then Camera.desligar() else Camera.ligar() end
        return { camera = Camera.estadoUI(), rerender = true }
    elseif acao == 'enquadrar' then
        Camera.enquadrarPersonagem()
        return { camera = Camera.estadoUI(), rerender = true }
    elseif acao == 'focar' then
        if not Camera.ativa then Notificar('Ligue a câmera primeiro.') return {} end
        Camera.focarCentro(true)
    elseif acao == 'salvarSlot' then
        Camera.salvarSlot(Inteiro(d.slot, 1))
        return { camera = Camera.estadoUI(), rerender = true }
    elseif acao == 'carregarSlot' then
        Camera.carregarSlot(Inteiro(d.slot, 1))
        return { camera = Camera.estadoUI(), rerender = true }
    elseif acao == 'definir' and CAMPOS[d.campo] then
        CAMPOS[d.campo](d.valor)
    end
    return { camera = Camera.estadoUI() }
end
