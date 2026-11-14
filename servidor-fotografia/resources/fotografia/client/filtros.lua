-- Filtros de cor (timecycle modifiers) em duas camadas: filtro principal + ajuste extra.

Filtros = { nome = '', forca = 1.0, extra = '', forcaExtra = 1.0 }

local function nomeValido(nome)
    if type(nome) ~= 'string' then return '' end
    nome = nome:gsub('[^%w_%-%.]', ''):sub(1, 64)
    return nome
end

function Filtros.definir(nome, forca)
    Filtros.nome = nomeValido(nome)
    if forca then Filtros.forca = Limitar(Numero(forca, 1.0), 0.0, 1.5) end
    if Filtros.nome == '' then
        ClearTimecycleModifier()
    else
        SetTimecycleModifier(Filtros.nome)
        SetTimecycleModifierStrength(Filtros.forca + 0.0)
    end
end

function Filtros.definirForca(forca)
    Filtros.forca = Limitar(Numero(forca, 1.0), 0.0, 1.5)
    if Filtros.nome ~= '' then SetTimecycleModifierStrength(Filtros.forca + 0.0) end
end

function Filtros.definirExtra(nome, forca)
    Filtros.extra = nomeValido(nome)
    if forca then Filtros.forcaExtra = Limitar(Numero(forca, 1.0), 0.0, 1.5) end
    if Filtros.extra == '' then
        ClearExtraTimecycleModifier()
    else
        SetExtraTimecycleModifier(Filtros.extra)
        SetExtraTimecycleModifierStrength(Filtros.forcaExtra + 0.0)
    end
end

function Filtros.definirForcaExtra(forca)
    Filtros.forcaExtra = Limitar(Numero(forca, 1.0), 0.0, 1.5)
    if Filtros.extra ~= '' then SetExtraTimecycleModifierStrength(Filtros.forcaExtra + 0.0) end
end

function Filtros.estadoUI()
    return { nome = Filtros.nome, forca = Filtros.forca, extra = Filtros.extra, forcaExtra = Filtros.forcaExtra }
end

function Filtros.comandoUI(d)
    local acao = d.acao
    if acao == 'filtro' then
        Filtros.definir(d.nome)
    elseif acao == 'forca' then
        Filtros.definirForca(d.valor)
    elseif acao == 'extra' then
        Filtros.definirExtra(d.nome)
    elseif acao == 'forcaExtra' then
        Filtros.definirForcaExtra(d.valor)
    elseif acao == 'limpar' then
        Filtros.definir('')
        Filtros.definirExtra('')
    end
    return { filtros = Filtros.estadoUI() }
end
