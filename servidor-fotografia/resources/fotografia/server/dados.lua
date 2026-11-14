-- Servidor: guarda os looks de cada jogador e os locais salvos (arquivos JSON na pasta data/).

local RECURSO = GetCurrentResourceName()
local ARQ_LOOKS = 'data/looks.json'
local ARQ_LOCAIS = 'data/locais.json'

local function ler(arquivo, padrao)
    local texto = LoadResourceFile(RECURSO, arquivo)
    if not texto or texto == '' then return padrao end
    local ok, dados = pcall(json.decode, texto)
    if ok and type(dados) == 'table' then return dados end
    print(('[fotografia] não consegui ler %s (arquivo corrompido?). Começando do zero.'):format(arquivo))
    return padrao
end

local function salvar(arquivo, dados)
    local ok = SaveResourceFile(RECURSO, arquivo, json.encode(dados, { indent = true }), -1)
    if not ok then print(('[fotografia] não consegui salvar %s'):format(arquivo)) end
end

local function arredondar(n)
    return math.floor(n * 100 + 0.5) / 100
end

-- ---------------------------------------------------------------- looks
-- looks[licença] = { ativo = 1, slots = { ['1'] = aparência, ... } }
local looks = ler(ARQ_LOOKS, {})

local function slotValido(slot)
    slot = tonumber(slot)
    if not slot then return nil end
    slot = math.floor(slot)
    if slot < 1 or slot > Config.Looks then return nil end
    return slot
end

Callbacks.listarLooks = function(src)
    local lic = Licenca(src)
    local reg = lic and looks[lic]
    local ocupados = {}
    for i = 1, Config.Looks do
        ocupados[i] = (reg and reg.slots and reg.slots[tostring(i)]) ~= nil
    end
    return { ocupados = ocupados, ativo = reg and reg.ativo or 1 }
end

-- Sem slot: devolve o look ativo (usado ao entrar no servidor)
Callbacks.carregarLook = function(src, slot, tornarAtivo)
    local lic = Licenca(src)
    local reg = lic and looks[lic]
    if not reg or not reg.slots then return nil end
    slot = slotValido(slot) or slotValido(reg.ativo) or 1
    local ap = reg.slots[tostring(slot)]
    if ap and tornarAtivo and reg.ativo ~= slot then
        reg.ativo = slot
        salvar(ARQ_LOOKS, looks)
    end
    return ap
end

Callbacks.salvarLook = function(src, slot, aparencia)
    local lic = Licenca(src)
    slot = slotValido(slot)
    if not lic or not slot or type(aparencia) ~= 'table' then return false end
    local ok, texto = pcall(json.encode, aparencia)
    if not ok or #texto > 32000 then return false end
    looks[lic] = looks[lic] or { ativo = slot, slots = {} }
    looks[lic].slots = looks[lic].slots or {}
    looks[lic].slots[tostring(slot)] = aparencia
    looks[lic].ativo = slot
    salvar(ARQ_LOOKS, looks)
    return true
end

-- ---------------------------------------------------------------- locais
local locais = ler(ARQ_LOCAIS, {})
local proximoId = 1
for _, l in ipairs(locais) do
    if (tonumber(l.id) or 0) >= proximoId then proximoId = l.id + 1 end
end

-- Só o necessário vai para os jogadores (a licença de quem salvou fica no servidor)
local function publicarLocais()
    local publico = {}
    for i, l in ipairs(locais) do
        publico[i] = { id = l.id, nome = l.nome, x = l.x, y = l.y, z = l.z, h = l.h, autorNome = l.autorNome }
    end
    GlobalState.fotoLocais = publico
end

publicarLocais()

RegisterNetEvent('fotografia:salvarLocal', function(nome, x, y, z, h)
    local src = source
    nome = tostring(nome or ''):gsub('%c', ''):sub(1, 40)
    x, y, z, h = tonumber(x), tonumber(y), tonumber(z), tonumber(h) or 0.0
    if nome == '' then Avisar(src, 'Dê um nome para o local.') return end
    if not (x and y and z) then return end
    if #locais >= 500 then Avisar(src, 'Limite de locais salvos atingido.') return end

    locais[#locais + 1] = {
        id = proximoId,
        nome = nome,
        x = arredondar(x), y = arredondar(y), z = arredondar(z), h = arredondar(h),
        autor = Licenca(src),
        autorNome = GetPlayerName(src),
    }
    proximoId = proximoId + 1
    salvar(ARQ_LOCAIS, locais)
    publicarLocais()
    Avisar(src, ('Local "%s" salvo para todo mundo.'):format(nome))
end)

RegisterNetEvent('fotografia:removerLocal', function(id)
    local src = source
    id = tonumber(id)
    for i, l in ipairs(locais) do
        if l.id == id then
            if l.autor ~= Licenca(src) and not EhAdmin(src) then
                Avisar(src, 'Só quem salvou (ou um admin) pode remover este local.')
                return
            end
            table.remove(locais, i)
            salvar(ARQ_LOCAIS, locais)
            publicarLocais()
            Avisar(src, ('Local "%s" removido.'):format(l.nome))
            return
        end
    end
end)
