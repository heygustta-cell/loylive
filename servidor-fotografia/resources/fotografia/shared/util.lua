-- Funções usadas tanto pelo servidor quanto pelos jogadores.

function Limitar(valor, minimo, maximo)
    if valor < minimo then return minimo end
    if valor > maximo then return maximo end
    return valor
end

function CopiarTabela(t)
    if type(t) ~= 'table' then return t end
    local copia = {}
    for k, v in pairs(t) do copia[k] = CopiarTabela(v) end
    return copia
end

local function existeNaLista(lista, id)
    for _, item in ipairs(lista) do
        if item.id == id then return true end
    end
    return false
end

function ClimaValido(id) return existeNaLista(Config.Climas, id) end
function NuvemValida(id) return existeNaLista(Config.Nuvens, id) end

function AmbientePadrao()
    local a = Config.Ambiente
    return {
        clima = a.Clima,
        hora = a.Hora,
        minuto = a.Minuto,
        congelado = a.HoraCongelada,
        apagao = false,
        nuvens = '',
        opacidadeNuvens = 1.0,
        vento = -1.0, -- -1 = automático (o clima decide)
        trafego = a.Trafego,
        pedestres = a.Pedestres,
    }
end

-- Recebe uma tabela de mudanças (vinda do painel ou de um comando) e devolve só o que é válido.
function ValidarMudancasAmbiente(m)
    local ok = {}
    if type(m) ~= 'table' then return ok end
    if type(m.clima) == 'string' and ClimaValido(m.clima) then ok.clima = m.clima end
    if tonumber(m.hora) then ok.hora = math.floor(Limitar(tonumber(m.hora), 0, 23)) end
    if tonumber(m.minuto) then ok.minuto = math.floor(Limitar(tonumber(m.minuto), 0, 59)) end
    if type(m.congelado) == 'boolean' then ok.congelado = m.congelado end
    if type(m.apagao) == 'boolean' then ok.apagao = m.apagao end
    if type(m.nuvens) == 'string' and NuvemValida(m.nuvens) then ok.nuvens = m.nuvens end
    if tonumber(m.opacidadeNuvens) then ok.opacidadeNuvens = Limitar(tonumber(m.opacidadeNuvens) + 0.0, 0.0, 1.0) end
    if tonumber(m.vento) then ok.vento = Limitar(tonumber(m.vento) + 0.0, -1.0, 12.0) end
    if tonumber(m.trafego) then ok.trafego = Limitar(tonumber(m.trafego) + 0.0, 0.0, 1.0) end
    if tonumber(m.pedestres) then ok.pedestres = Limitar(tonumber(m.pedestres) + 0.0, 0.0, 1.0) end
    return ok
end

function AvancarRelogio(a)
    a.minuto = a.minuto + 1
    if a.minuto >= 60 then
        a.minuto = 0
        a.hora = (a.hora + 1) % 24
    end
end
