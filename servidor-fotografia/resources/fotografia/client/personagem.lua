-- Personagem: modelo, rosto (herança, traços, maquiagem), cabelo, roupas, acessórios e looks salvos.

Personagem = { atual = nil, salva = nil, looks = nil, paletas = nil }

local FREEMODE = {
    [GetHashKey('mp_m_freemode_01')] = true,
    [GetHashKey('mp_f_freemode_01')] = true,
}

local COMPONENTES = {
    { id = 11, nome = 'Jaqueta / blusa' },
    { id = 8, nome = 'Camiseta de baixo' },
    { id = 3, nome = 'Braços / mãos' },
    { id = 4, nome = 'Calça' },
    { id = 6, nome = 'Sapatos' },
    { id = 7, nome = 'Pescoço (colar, gravata)' },
    { id = 1, nome = 'Máscara' },
    { id = 5, nome = 'Mochila / bolsa' },
    { id = 9, nome = 'Colete' },
    { id = 10, nome = 'Emblemas' },
    { id = 0, nome = 'Cabeça (variação)' }, -- só aparece em personagens não customizáveis
}

local PROPS = {
    { id = 0, nome = 'Chapéu / boné' },
    { id = 1, nome = 'Óculos' },
    { id = 2, nome = 'Brincos' },
    { id = 6, nome = 'Relógio' },
    { id = 7, nome = 'Pulseira' },
}

-- tipoCor: 1 = usa cores de cabelo, 2 = usa cores de maquiagem
local OVERLAYS = {
    { id = 2, nome = 'Sobrancelhas', tipoCor = 1 },
    { id = 1, nome = 'Barba', tipoCor = 1 },
    { id = 4, nome = 'Maquiagem dos olhos' },
    { id = 8, nome = 'Batom', tipoCor = 2 },
    { id = 5, nome = 'Blush', tipoCor = 2 },
    { id = 9, nome = 'Sardas / pintas' },
    { id = 0, nome = 'Manchas' },
    { id = 3, nome = 'Envelhecimento' },
    { id = 6, nome = 'Textura da pele' },
    { id = 7, nome = 'Marcas de sol' },
    { id = 10, nome = 'Pelos do peito', tipoCor = 1 },
}
local OVERLAY_POR_ID = {}
for _, o in ipairs(OVERLAYS) do OVERLAY_POR_ID[o.id] = o end

local TRACOS = {
    'Nariz: largura', 'Nariz: altura', 'Nariz: comprimento', 'Nariz: ponte', 'Nariz: ponta',
    'Nariz: torto', 'Sobrancelha: altura', 'Sobrancelha: profundidade', 'Maçãs do rosto: altura',
    'Maçãs do rosto: largura', 'Bochechas', 'Olhos: abertura', 'Lábios: espessura', 'Mandíbula: largura',
    'Mandíbula: formato', 'Queixo: altura', 'Queixo: comprimento', 'Queixo: largura', 'Queixo: covinha',
    'Pescoço: espessura',
}

local function ehFreemode(ped)
    return FREEMODE[GetEntityModel(ped)] == true
end

local function aparenciaPadrao(modelo)
    local rosto = {}
    for i = 1, #TRACOS do rosto[i] = 0.0 end
    local overlays = {}
    for i, o in ipairs(OVERLAYS) do
        overlays[i] = { id = o.id, valor = (o.id == 2) and 0 or -1, opacidade = 1.0, cor = 0 }
    end
    return {
        modelo = modelo,
        heranca = { mae = 21, pai = 0, semelhanca = 0.5, pele = 0.5 },
        cabeloCor = 0,
        cabeloMechas = 0,
        olhos = 0,
        overlays = overlays,
        rosto = rosto,
    }
end

local function garantirAtual()
    if not Personagem.atual then Personagem.atual = aparenciaPadrao(Config.ModeloPadrao) end
    return Personagem.atual
end

local function aplicarOverlay(ped, o)
    local valor = Inteiro(o.valor, -1)
    if valor < 0 then valor = 255 end
    SetPedHeadOverlay(ped, Inteiro(o.id), valor, Limitar(Numero(o.opacidade, 1.0), 0.0, 1.0))
    local def = OVERLAY_POR_ID[Inteiro(o.id)]
    if def and def.tipoCor then
        SetPedHeadOverlayColor(ped, Inteiro(o.id), def.tipoCor, Inteiro(o.cor), Inteiro(o.cor))
    end
end

local function aplicarCabeca(ped, a)
    if not ehFreemode(ped) then return end
    local h = a.heranca
    SetPedHeadBlendData(ped, Inteiro(h.mae), Inteiro(h.pai), 0, Inteiro(h.mae), Inteiro(h.pai), 0,
        Numero(h.semelhanca, 0.5), Numero(h.pele, 0.5), 0.0, false)
    for i, v in ipairs(a.rosto or {}) do SetPedFaceFeature(ped, i - 1, Numero(v)) end
    for _, o in ipairs(a.overlays or {}) do aplicarOverlay(ped, o) end
    SetPedEyeColor(ped, Inteiro(a.olhos))
    SetPedHairColor(ped, Inteiro(a.cabeloCor), Inteiro(a.cabeloMechas))
end

local function trocarModelo(nome)
    local hash = CarregarModelo(nome)
    if not hash or not IsModelAPed(hash) then return false end

    local ped = PlayerPedId()
    local veh, assento = GetVehiclePedIsIn(ped, false), nil
    if veh ~= 0 then
        for s = -1, GetVehicleMaxNumberOfPassengers(veh) - 1 do
            if GetPedInVehicleSeat(veh, s) == ped then assento = s break end
        end
    end

    SetPlayerModel(PlayerId(), hash)
    SetModelAsNoLongerNeeded(hash)
    ped = PlayerPedId()
    SetPedDefaultComponentVariation(ped)
    if veh ~= 0 and assento then SetPedIntoVehicle(ped, veh, assento) end

    Personagem.atual = aparenciaPadrao(nome)
    aplicarCabeca(ped, Personagem.atual)
    Poses.atual, Poses.congelada, Poses.expressao = nil, false, ''
    return true
end

function Personagem.aplicar(a)
    if type(a) ~= 'table' then return false end
    local ped = PlayerPedId()
    if type(a.modelo) == 'string' and GetEntityModel(ped) ~= GetHashKey(a.modelo) then
        if not trocarModelo(a.modelo) then return false end
        ped = PlayerPedId()
    end

    local atual = aparenciaPadrao(a.modelo or Config.ModeloPadrao)
    for _, campo in ipairs({ 'heranca', 'cabeloCor', 'cabeloMechas', 'olhos', 'overlays', 'rosto' }) do
        if a[campo] ~= nil then atual[campo] = CopiarTabela(a[campo]) end
    end
    Personagem.atual = atual

    for _, c in ipairs(a.componentes or {}) do
        SetPedComponentVariation(ped, Inteiro(c.id), Inteiro(c.d), Inteiro(c.t), 0)
    end
    aplicarCabeca(ped, atual)
    for _, p in ipairs(a.props or {}) do
        if Inteiro(p.d, -1) < 0 then
            ClearPedProp(ped, Inteiro(p.id))
        else
            SetPedPropIndex(ped, Inteiro(p.id), Inteiro(p.d), Inteiro(p.t), true)
        end
    end
    return true
end

-- Usada ao nascer: aplica o look salvo ou deixa o personagem padrão bonitinho
function Personagem.aplicarSalva()
    if Personagem.salva and Personagem.aplicar(Personagem.salva) then return end
    local ped = PlayerPedId()
    Personagem.atual = aparenciaPadrao(Config.ModeloPadrao)
    if ehFreemode(ped) then
        SetPedDefaultComponentVariation(ped)
        aplicarCabeca(ped, Personagem.atual)
    end
end

-- Tudo o que define o visual atual, pronto para salvar no servidor
function Personagem.coletar()
    local ped = PlayerPedId()
    local a = CopiarTabela(garantirAtual())
    a.componentes = {}
    for id = 0, 11 do
        a.componentes[#a.componentes + 1] = { id = id, d = GetPedDrawableVariation(ped, id), t = GetPedTextureVariation(ped, id) }
    end
    a.props = {}
    for _, p in ipairs(PROPS) do
        a.props[#a.props + 1] = { id = p.id, d = GetPedPropIndex(ped, p.id), t = GetPedPropTextureIndex(ped, p.id) }
    end
    return a
end

function Personagem.atualizarLooks()
    Personagem.looks = ChamarServidor('listarLooks')
end

-- ------------------------------------------------------------------ painel
local function paleta(fn, total)
    local lista = {}
    if type(fn) ~= 'function' then return lista end
    for i = 0, total - 1 do
        local ok, r, g, b = pcall(fn, i)
        if not ok or type(r) ~= 'number' then return {} end
        lista[#lista + 1] = { r = r, g = g, b = b }
    end
    return lista
end

local function paletas()
    if not Personagem.paletas then
        local totalCabelo = (GetNumHairColors and GetNumHairColors()) or 64
        local totalMaquiagem = (GetNumMakeupColors and GetNumMakeupColors()) or 64
        Personagem.paletas = {
            cabelo = paleta(GetPedHairRgbColor, totalCabelo),
            maquiagem = paleta(GetPedMakeupRgbColor, totalMaquiagem),
            totalCabelo = totalCabelo,
            totalMaquiagem = totalMaquiagem,
        }
    end
    return Personagem.paletas
end

local function estadoComponente(ped, id, nome)
    local d = GetPedDrawableVariation(ped, id)
    return {
        id = id, nome = nome,
        d = d, dMax = GetNumberOfPedDrawableVariations(ped, id) - 1,
        t = GetPedTextureVariation(ped, id), tMax = math.max(GetNumberOfPedTextureVariations(ped, id, d) - 1, 0),
    }
end

local function estadoProp(ped, id, nome)
    local d = GetPedPropIndex(ped, id)
    return {
        id = id, nome = nome,
        d = d, dMax = GetNumberOfPedPropDrawableVariations(ped, id) - 1,
        t = math.max(GetPedPropTextureIndex(ped, id), 0),
        tMax = d >= 0 and math.max(GetNumberOfPedPropTextureVariations(ped, id, d) - 1, 0) or 0,
    }
end

function Personagem.estadoUI()
    local ped = PlayerPedId()
    local a = garantirAtual()
    local freemode = ehFreemode(ped)
    local pal = paletas()

    local componentes = {}
    for _, c in ipairs(COMPONENTES) do
        if not (freemode and c.id == 0) and GetNumberOfPedDrawableVariations(ped, c.id) > 1 then
            componentes[#componentes + 1] = estadoComponente(ped, c.id, c.nome)
        end
    end

    local props = {}
    for _, p in ipairs(PROPS) do
        if GetNumberOfPedPropDrawableVariations(ped, p.id) > 0 then
            props[#props + 1] = estadoProp(ped, p.id, p.nome)
        end
    end

    local overlays = {}
    for i, def in ipairs(OVERLAYS) do
        local o = a.overlays[i] or { id = def.id, valor = -1, opacidade = 1.0, cor = 0 }
        overlays[i] = {
            id = def.id, nome = def.nome, tipoCor = def.tipoCor or 0,
            valor = Inteiro(o.valor, -1), max = GetPedHeadOverlayNum(def.id) - 1,
            opacidade = Numero(o.opacidade, 1.0), cor = Inteiro(o.cor),
        }
    end

    local rosto = {}
    for i, nome in ipairs(TRACOS) do rosto[i] = { indice = i - 1, nome = nome, valor = Numero(a.rosto[i]) } end

    return {
        modelo = a.modelo or '',
        freemode = freemode,
        heranca = a.heranca,
        cabelo = estadoComponente(ped, 2, 'Corte'),
        cabeloCor = a.cabeloCor,
        cabeloMechas = a.cabeloMechas,
        totalCoresCabelo = pal.totalCabelo,
        totalCoresMaquiagem = pal.totalMaquiagem,
        paletaCabelo = pal.cabelo,
        paletaMaquiagem = pal.maquiagem,
        olhos = a.olhos,
        overlays = overlays,
        rosto = rosto,
        componentes = componentes,
        props = props,
        looks = Personagem.looks or { ocupados = {}, ativo = 1 },
        totalLooks = Config.Looks,
    }
end

local function mudarComponente(ped, d)
    local id = Inteiro(d.id)
    local total = GetNumberOfPedDrawableVariations(ped, id)
    if total <= 0 then return end
    local desenho = Circular(Inteiro(d.d), 0, total - 1)
    local texturas = GetNumberOfPedTextureVariations(ped, id, desenho)
    local textura = (d.campo == 'd') and 0 or Circular(Inteiro(d.t), 0, math.max(texturas - 1, 0))
    SetPedComponentVariation(ped, id, desenho, textura, 0)
end

local function mudarProp(ped, d)
    local id = Inteiro(d.id)
    local total = GetNumberOfPedPropDrawableVariations(ped, id)
    local desenho = Circular(Inteiro(d.d, -1), -1, total - 1)
    if desenho < 0 then
        ClearPedProp(ped, id)
        return
    end
    local texturas = GetNumberOfPedPropTextureVariations(ped, id, desenho)
    local textura = (d.campo == 'd') and 0 or Circular(Inteiro(d.t), 0, math.max(texturas - 1, 0))
    SetPedPropIndex(ped, id, desenho, textura, true)
end

function Personagem.comandoUI(d)
    local ped = PlayerPedId()
    local a = garantirAtual()
    local acao = d.acao

    if acao == 'modelo' then
        local nome = tostring(d.modelo or ''):lower():gsub('[^%w_]', '')
        if nome ~= '' and trocarModelo(nome) then
            return { personagem = Personagem.estadoUI(), poses = Poses.estadoUI(), rerender = true }
        end
        Notificar(('Modelo "%s" não existe nesta versão do jogo.'):format(nome))
        return {}
    elseif acao == 'componente' then
        mudarComponente(ped, d)
    elseif acao == 'prop' then
        mudarProp(ped, d)
    elseif acao == 'heranca' then
        if d.campo == 'mae' or d.campo == 'pai' then
            a.heranca[d.campo] = Circular(Inteiro(d.valor), 0, 45)
        elseif d.campo == 'semelhanca' or d.campo == 'pele' then
            a.heranca[d.campo] = Limitar(Numero(d.valor), 0.0, 1.0)
        end
        aplicarCabeca(ped, a)
    elseif acao == 'cabeloCor' then
        local total = paletas().totalCabelo
        if d.cor ~= nil then a.cabeloCor = Circular(Inteiro(d.cor), 0, total - 1) end
        if d.mechas ~= nil then a.cabeloMechas = Circular(Inteiro(d.mechas), 0, total - 1) end
        SetPedHairColor(ped, a.cabeloCor, a.cabeloMechas)
    elseif acao == 'olhos' then
        a.olhos = Circular(Inteiro(d.valor), 0, 31)
        SetPedEyeColor(ped, a.olhos)
    elseif acao == 'overlay' then
        local id = Inteiro(d.id)
        for _, o in ipairs(a.overlays) do
            if o.id == id then
                if d.campo == 'valor' then
                    o.valor = Circular(Inteiro(d.valor, -1), -1, GetPedHeadOverlayNum(id) - 1)
                elseif d.campo == 'opacidade' then
                    o.opacidade = Limitar(Numero(d.valor, 1.0), 0.0, 1.0)
                elseif d.campo == 'cor' then
                    o.cor = math.max(Inteiro(d.valor), 0)
                end
                aplicarOverlay(ped, o)
            end
        end
    elseif acao == 'rosto' then
        local i = Inteiro(d.indice, -1)
        if i >= 0 and i < #TRACOS then
            a.rosto[i + 1] = Limitar(Numero(d.valor), -1.0, 1.0)
            SetPedFaceFeature(ped, i, a.rosto[i + 1])
        end
    elseif acao == 'aleatorio' then
        SetPedRandomComponentVariation(ped, 0)
        SetPedRandomProps(ped)
    elseif acao == 'tirarAcessorios' then
        ClearAllPedProps(ped)
    elseif acao == 'salvarLook' then
        local slot = Inteiro(d.slot, 1)
        local look = Personagem.coletar()
        if ChamarServidor('salvarLook', slot, look) then
            Personagem.salva = look
            Personagem.atualizarLooks()
            Notificar(('Look %d salvo. Ele será usado quando você entrar no servidor.'):format(slot))
        else
            Notificar('Não consegui salvar o look.')
        end
    elseif acao == 'usarLook' then
        local slot = Inteiro(d.slot, 1)
        local look = ChamarServidor('carregarLook', slot, true)
        if not look then
            Notificar(('O look %d está vazio.'):format(slot))
            return {}
        end
        Personagem.salva = look
        Personagem.aplicar(look)
        Personagem.atualizarLooks()
        return { personagem = Personagem.estadoUI(), rerender = true }
    end
    return { personagem = Personagem.estadoUI() }
end
