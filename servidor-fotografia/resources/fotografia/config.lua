-- =====================================================================
--  CONFIGURAÇÃO DO SERVIDOR DE FOTOGRAFIA
--  Tudo aqui pode ser editado. Depois de mudar, reinicie o recurso
--  (no console do servidor: "restart fotografia") ou o servidor todo.
-- =====================================================================
Config = {}

Config.NomeServidor = 'Estúdio de Fotografia'

-- Senha para entrar no servidor. Deixe '' (vazio) para qualquer um entrar.
Config.Senha = ''

-- Onde o jogador aparece ao entrar: x, y, z, direção (graus)
Config.Spawn = vector4(686.245, 577.950, 130.461, 70.0)

-- Personagem padrão de quem entra pela primeira vez
-- 'mp_m_freemode_01' = masculino customizável | 'mp_f_freemode_01' = feminino customizável
Config.ModeloPadrao = 'mp_m_freemode_01'

-- Teclas padrão (cada jogador pode trocar em Configurações > Teclas > FiveM)
Config.Teclas = {
    Camera = 'F6', -- liga/desliga a câmera livre
    Painel = 'F7', -- abre o painel de fotografia
}

-- Ninguém consegue socar, atirar ou ser procurado pela polícia
Config.DesativarAtaques = true

-- Texto da placa dos carros criados
Config.Placa = 'FOTO'

-- Ao criar um carro novo, apaga o último que você criou (evita a cidade lotada)
Config.ApagarVeiculoAnterior = true

-- Quantos "looks" (roupa + rosto) cada jogador pode salvar
Config.Looks = 3

Config.Camera = {
    Velocidade = 5.0,            -- metros por segundo (velocidade 1.0x)
    MultiplicadorRapido = 4.0,   -- segurando Shift
    MultiplicadorLento = 0.2,    -- segurando Alt
    SensibilidadeMouse = 5.0,
    SensibilidadeControle = 2.0,
    FovMin = 5.0,                -- zoom máximo (teleobjetiva)
    FovMax = 110.0,              -- zoom mínimo (grande-angular)
    -- Distância máxima entre a câmera e o seu personagem (0 = sem limite).
    -- Longe demais, outros jogadores e carros somem (o jogo só carrega o que está perto do seu boneco).
    DistanciaMaxima = 0.0,
}

Config.Ambiente = {
    Clima = 'EXTRASUNNY',
    Hora = 19,
    Minuto = 0,
    HoraCongelada = true,
    MsPorMinuto = 2000,          -- velocidade do relógio quando não está congelado (2000 = igual ao GTA)
    Trafego = 1.0,               -- 0.0 (ruas vazias) até 1.0 (normal)
    Pedestres = 1.0,
    SoAdminPodeMudar = false,    -- true = só admins mudam clima/hora para todos
}

Config.Luzes = {
    Maximo = 12,
}

Config.Climas = {
    { id = 'EXTRASUNNY', nome = 'Sol forte' },
    { id = 'CLEAR', nome = 'Céu limpo' },
    { id = 'NEUTRAL', nome = 'Neutro' },
    { id = 'CLOUDS', nome = 'Nuvens' },
    { id = 'OVERCAST', nome = 'Nublado' },
    { id = 'SMOG', nome = 'Poluição' },
    { id = 'FOGGY', nome = 'Neblina' },
    { id = 'CLEARING', nome = 'Pós-chuva' },
    { id = 'RAIN', nome = 'Chuva' },
    { id = 'THUNDER', nome = 'Tempestade' },
    { id = 'SNOWLIGHT', nome = 'Neve leve' },
    { id = 'SNOW', nome = 'Neve' },
    { id = 'BLIZZARD', nome = 'Nevasca' },
    { id = 'XMAS', nome = 'Natal (neve)' },
    { id = 'HALLOWEEN', nome = 'Halloween' },
}

-- Formatos de nuvem ("cloud hats"). '' = deixa o clima decidir.
Config.Nuvens = {
    { id = '', nome = 'Automático' },
    { id = 'Clear 01', nome = 'Quase limpo' },
    { id = 'Wispy', nome = 'Fiapos' },
    { id = 'Cirrus', nome = 'Cirros' },
    { id = 'cirrocumulus', nome = 'Cirrocúmulos' },
    { id = 'altostratus', nome = 'Altostratus' },
    { id = 'stratoscumulus', nome = 'Estratocúmulos' },
    { id = 'Puffs', nome = 'Algodão' },
    { id = 'Cloudy 01', nome = 'Nublado' },
    { id = 'Nimbus', nome = 'Nimbos' },
    { id = 'Stormy 01', nome = 'Tempestuoso' },
    { id = 'shower', nome = 'Pancadas' },
    { id = 'Stripey', nome = 'Listrado' },
    { id = 'Contrails', nome = 'Rastros de avião' },
    { id = 'Horizon', nome = 'Horizonte' },
    { id = 'horizonband1', nome = 'Faixa baixa' },
    { id = 'Snowy 01', nome = 'Nevado' },
}

-- Atalhos de horário no painel (aproximados: ajuste fino no controle deslizante)
Config.HorariosRapidos = {
    { nome = 'Amanhecer', h = 6, m = 0 },
    { nome = 'Manhã', h = 9, m = 0 },
    { nome = 'Meio-dia', h = 12, m = 0 },
    { nome = 'Hora dourada', h = 19, m = 0 },
    { nome = 'Pôr do sol', h = 20, m = 0 },
    { nome = 'Hora azul', h = 21, m = 0 },
    { nome = 'Noite', h = 0, m = 0 },
}

-- Filtros de cor (timecycle modifiers do GTA). Dá para digitar outros no painel.
Config.Filtros = {
    { id = '', nome = 'Nenhum', grupo = 'Básicos' },
    { id = 'cinema', nome = 'Cinema', grupo = 'Básicos' },
    { id = 'Hint_cam', nome = 'Foco cinematográfico', grupo = 'Básicos' },
    { id = 'NG_filmnoir_BW01', nome = 'Noir P&B 1', grupo = 'Preto e branco' },
    { id = 'NG_filmnoir_BW02', nome = 'Noir P&B 2', grupo = 'Preto e branco' },
    { id = 'CAMERA_BW', nome = 'P&B duro', grupo = 'Preto e branco' },
    { id = 'MP_corona_heist_BW', nome = 'P&B suave', grupo = 'Preto e branco' },
    { id = 'LostTimeDay', nome = 'Dourado (dia)', grupo = 'Especiais' },
    { id = 'LostTimeNight', nome = 'Dourado (noite)', grupo = 'Especiais' },
    { id = 'Kifflom', nome = 'Psicodélico', grupo = 'Especiais' },
    { id = 'MP_Bull_tost', nome = 'Sonho', grupo = 'Especiais' },
    { id = 'nervousRON_fog', nome = 'Névoa', grupo = 'Especiais' },
}
-- 25 filtros do Rockstar Editor
for i = 1, 25 do
    Config.Filtros[#Config.Filtros + 1] = { id = ('NG_filmic%02d'):format(i), nome = ('Editor %02d'):format(i), grupo = 'Rockstar Editor' }
end
-- Filtros da câmera do celular (Snapmatic)
for i = 1, 12 do
    Config.Filtros[#Config.Filtros + 1] = { id = 'phone_cam' .. i, nome = 'Snapmatic ' .. i, grupo = 'Snapmatic' }
end

-- Segunda camada de ajuste, por cima do filtro
Config.AjustesExtras = {
    { id = '', nome = 'Nenhum' },
    { id = 'rply_saturation', nome = '+ Saturação' },
    { id = 'rply_saturation_neg', nome = '− Saturação' },
    { id = 'rply_contrast', nome = '+ Contraste' },
    { id = 'rply_contrast_neg', nome = '− Contraste' },
    { id = 'rply_brightness', nome = '+ Brilho' },
    { id = 'rply_brightness_neg', nome = '− Brilho' },
    { id = 'rply_vignette', nome = 'Vinheta' },
    { id = 'rply_vignette_neg', nome = 'Vinheta clara' },
    { id = 'rply_motionblur', nome = 'Borrão de movimento' },
}

-- Poses. "cenario" = cenários prontos do GTA; "dict/anim" = animações.
-- flag: 1 = repete o corpo todo | 49 = só a parte de cima, repetindo | 2 = para no último quadro
-- cmd = atalho no chat (/e cmd)
Config.Poses = {
    -- Em pé
    { nome = 'Braços cruzados', cmd = 'cruzar', categoria = 'Em pé', dict = 'amb@world_human_hang_out_street@female_arms_crossed@base', anim = 'base', flag = 1 },
    { nome = 'Braços cruzados (firme)', cmd = 'firme', categoria = 'Em pé', dict = 'mini@strip_club@idles@bouncer@base', anim = 'base', flag = 1 },
    { nome = 'Pose de chefe', cmd = 'chefe', categoria = 'Em pé', dict = 'anim@heists@heist_corona@single_team', anim = 'single_team_loop_boss', flag = 1 },
    { nome = 'De boa na rua', cmd = 'deboa', categoria = 'Em pé', cenario = 'WORLD_HUMAN_HANG_OUT_STREET' },
    { nome = 'Encostado na parede', cmd = 'encostar', categoria = 'Em pé', cenario = 'WORLD_HUMAN_LEANING' },
    { nome = 'Impaciente', cmd = 'impaciente', categoria = 'Em pé', cenario = 'WORLD_HUMAN_STAND_IMPATIENT' },
    { nome = 'Pensativo', cmd = 'pensar', categoria = 'Em pé', dict = 'mp_cp_welcome_tutthink', anim = 'b_think', flag = 49 },
    { nome = 'Segurança parado', cmd = 'guarda', categoria = 'Em pé', cenario = 'WORLD_HUMAN_GUARD_STAND' },
    { nome = 'Estátua viva', cmd = 'estatua', categoria = 'Em pé', cenario = 'WORLD_HUMAN_HUMAN_STATUE' },
    { nome = 'Super-herói', cmd = 'heroi', categoria = 'Em pé', cenario = 'WORLD_HUMAN_SUPERHERO' },
    { nome = 'Olhando vitrine', cmd = 'vitrine', categoria = 'Em pé', cenario = 'WORLD_HUMAN_WINDOW_SHOP_BROWSE' },
    { nome = 'Mãos pra cima', cmd = 'maosaocima', categoria = 'Em pé', dict = 'missminuteman_1ig_2', anim = 'handsup_base', flag = 49 },

    -- Gestos
    { nome = 'Acenando', cmd = 'acenar', categoria = 'Gestos', dict = 'friends@frj@ig_1', anim = 'wave_a', flag = 49 },
    { nome = 'Paz e amor', cmd = 'paz', categoria = 'Gestos', dict = 'mp_player_int_upperpeace_sign', anim = 'mp_player_int_peace_sign', flag = 49 },
    { nome = 'Joinha', cmd = 'joinha', categoria = 'Gestos', dict = 'anim@mp_player_intselfiethumbs_up', anim = 'idle_a', flag = 49 },
    { nome = 'Continência', cmd = 'continencia', categoria = 'Gestos', dict = 'mp_player_int_uppersalute', anim = 'mp_player_int_salute', flag = 49 },
    { nome = 'Mandando beijo', cmd = 'beijo', categoria = 'Gestos', dict = 'anim@mp_player_intcelebrationfemale@blow_kiss', anim = 'blow_kiss', flag = 1 },
    { nome = 'Mão na testa', cmd = 'facepalm', categoria = 'Gestos', dict = 'anim@mp_player_intcelebrationmale@face_palm', anim = 'face_palm', flag = 1 },
    { nome = 'Comemorando', cmd = 'comemorar', categoria = 'Gestos', cenario = 'WORLD_HUMAN_CHEERING' },
    { nome = 'Mostrando músculo', cmd = 'musculo', categoria = 'Gestos', cenario = 'WORLD_HUMAN_MUSCLE_FLEX' },

    -- Sentado / deitado
    { nome = 'Sentado no chão', cmd = 'sentar', categoria = 'Sentado e deitado', cenario = 'WORLD_HUMAN_PICNIC' },
    { nome = 'Sentado no chão (pernas cruzadas)', cmd = 'sentar2', categoria = 'Sentado e deitado', dict = 'amb@world_human_picnic@female@base', anim = 'base', flag = 1 },
    { nome = 'Sentado em cadeira (invisível)', cmd = 'cadeira', categoria = 'Sentado e deitado', cenario = 'PROP_HUMAN_SEAT_CHAIR_MP_PLAYER' },
    { nome = 'Sentado na mureta', cmd = 'mureta', categoria = 'Sentado e deitado', cenario = 'WORLD_HUMAN_SEAT_LEDGE' },
    { nome = 'Sentado na escada', cmd = 'escada', categoria = 'Sentado e deitado', cenario = 'WORLD_HUMAN_SEAT_STEPS' },
    { nome = 'Sentado no muro', cmd = 'muro', categoria = 'Sentado e deitado', cenario = 'WORLD_HUMAN_SEAT_WALL' },
    { nome = 'Ajoelhado', cmd = 'ajoelhar', categoria = 'Sentado e deitado', dict = 'amb@medic@standing@kneel@base', anim = 'base', flag = 1 },
    { nome = 'Rendido (ajoelhado)', cmd = 'rendido', categoria = 'Sentado e deitado', dict = 'random@arrests@busted', anim = 'idle_a', flag = 1 },
    { nome = 'Tomando sol (de bruços)', cmd = 'sol', categoria = 'Sentado e deitado', cenario = 'WORLD_HUMAN_SUNBATHE' },
    { nome = 'Tomando sol (de costas)', cmd = 'sol2', categoria = 'Sentado e deitado', cenario = 'WORLD_HUMAN_SUNBATHE_BACK' },
    { nome = 'Largado no chão', cmd = 'largado', categoria = 'Sentado e deitado', cenario = 'WORLD_HUMAN_STUPOR' },
    { nome = 'Desmaiado', cmd = 'desmaiar', categoria = 'Sentado e deitado', cenario = 'WORLD_HUMAN_BUM_SLUMPED' },

    -- Ação
    { nome = 'Fotógrafo (câmera na mão)', cmd = 'fotografo', categoria = 'Ação', cenario = 'WORLD_HUMAN_PAPARAZZI' },
    { nome = 'Filmando com o celular', cmd = 'filmar', categoria = 'Ação', cenario = 'WORLD_HUMAN_MOBILE_FILM_SHOCKING' },
    { nome = 'Mexendo no celular', cmd = 'celular', categoria = 'Ação', cenario = 'WORLD_HUMAN_STAND_MOBILE' },
    { nome = 'Turista tirando foto', cmd = 'turista', categoria = 'Ação', cenario = 'WORLD_HUMAN_TOURIST_MOBILE' },
    { nome = 'Lendo mapa', cmd = 'mapa', categoria = 'Ação', cenario = 'WORLD_HUMAN_TOURIST_MAP' },
    { nome = 'Binóculo', cmd = 'binoculo', categoria = 'Ação', cenario = 'WORLD_HUMAN_BINOCULARS' },
    { nome = 'Tomando café', cmd = 'cafe', categoria = 'Ação', cenario = 'WORLD_HUMAN_AA_COFFEE' },
    { nome = 'Bebendo', cmd = 'beber', categoria = 'Ação', cenario = 'WORLD_HUMAN_DRINKING' },
    { nome = 'Fumando', cmd = 'fumar', categoria = 'Ação', cenario = 'WORLD_HUMAN_SMOKING' },
    { nome = 'Tocando música', cmd = 'musico', categoria = 'Ação', cenario = 'WORLD_HUMAN_MUSICIAN' },
    { nome = 'Na festa', cmd = 'festa', categoria = 'Ação', cenario = 'WORLD_HUMAN_PARTYING' },
    { nome = 'Dançando', cmd = 'dancar', categoria = 'Ação', dict = 'anim@amb@nightclub@mini@dance@dance_solo@female@var_a@', anim = 'high_center', flag = 1 },
    { nome = 'Dançando 2', cmd = 'dancar2', categoria = 'Ação', dict = 'anim@amb@nightclub@mini@dance@dance_solo@male@var_a@', anim = 'high_center', flag = 1 },
    { nome = 'Pescando', cmd = 'pescar', categoria = 'Ação', cenario = 'WORLD_HUMAN_STAND_FISHING' },
    { nome = 'Yoga', cmd = 'yoga', categoria = 'Ação', cenario = 'WORLD_HUMAN_YOGA' },
    { nome = 'Flexão', cmd = 'flexao', categoria = 'Ação', cenario = 'WORLD_HUMAN_PUSH_UPS' },
    { nome = 'Abdominal', cmd = 'abdominal', categoria = 'Ação', cenario = 'WORLD_HUMAN_SIT_UPS' },
    { nome = 'Aquecendo', cmd = 'aquecer', categoria = 'Ação', cenario = 'WORLD_HUMAN_JOG_STANDING' },
    { nome = 'Golfe', cmd = 'golfe', categoria = 'Ação', cenario = 'WORLD_HUMAN_GOLF_PLAYER' },
    { nome = 'Tênis', cmd = 'tenis', categoria = 'Ação', cenario = 'WORLD_HUMAN_TENNIS_PLAYER' },
    { nome = 'Prancheta', cmd = 'prancheta', categoria = 'Ação', cenario = 'WORLD_HUMAN_CLIPBOARD' },
    { nome = 'Agachado olhando', cmd = 'agachar', categoria = 'Ação', cenario = 'WORLD_HUMAN_INSPECT_CROUCH' },
    { nome = 'Mecânico (deitado)', cmd = 'mecanico', categoria = 'Ação', cenario = 'WORLD_HUMAN_VEHICLE_MECHANIC' },
    { nome = 'Soldando', cmd = 'soldar', categoria = 'Ação', cenario = 'WORLD_HUMAN_WELDING' },
    { nome = 'Aquecendo no fogo', cmd = 'fogueira', categoria = 'Ação', cenario = 'WORLD_HUMAN_STAND_FIRE' },
}

Config.Expressoes = {
    { id = '', nome = 'Normal' },
    { id = 'mood_happy_1', nome = 'Feliz' },
    { id = 'mood_smug_1', nome = 'Convencido' },
    { id = 'mood_angry_1', nome = 'Bravo' },
    { id = 'mood_aiming_1', nome = 'Concentrado' },
    { id = 'mood_stressed_1', nome = 'Estressado' },
    { id = 'mood_sulk_1', nome = 'Emburrado' },
    { id = 'mood_injured_1', nome = 'Dolorido' },
    { id = 'mood_drunk_1', nome = 'Bêbado' },
}

-- Modelos de personagem rápidos (qualquer outro pode ser digitado no painel)
Config.ModelosRapidos = {
    { m = 'mp_m_freemode_01', n = 'Masculino (customizável)' },
    { m = 'mp_f_freemode_01', n = 'Feminino (customizável)' },
    { m = 'player_zero', n = 'Michael' },
    { m = 'player_one', n = 'Franklin' },
    { m = 'player_two', n = 'Trevor' },
    { m = 'a_f_y_beach_01', n = 'Praia (mulher)' },
    { m = 'a_m_y_beach_01', n = 'Praia (homem)' },
    { m = 'a_f_y_hipster_01', n = 'Hipster (mulher)' },
    { m = 'a_m_y_hipster_01', n = 'Hipster (homem)' },
    { m = 'a_f_y_fitness_01', n = 'Fitness' },
    { m = 'a_m_y_musclbeac_01', n = 'Marombeiro' },
    { m = 's_m_y_cop_01', n = 'Policial' },
    { m = 's_f_y_cop_01', n = 'Policial (mulher)' },
    { m = 's_m_y_fireman_01', n = 'Bombeiro' },
    { m = 'a_c_husky', n = 'Cachorro: Husky' },
    { m = 'a_c_retriever', n = 'Cachorro: Retriever' },
    { m = 'a_c_shepherd', n = 'Cachorro: Pastor' },
    { m = 'a_c_pug', n = 'Cachorro: Pug' },
    { m = 'a_c_westy', n = 'Cachorro: Westie' },
    { m = 'a_c_poodle', n = 'Cachorro: Poodle' },
    { m = 'a_c_rottweiler', n = 'Cachorro: Rottweiler' },
    { m = 'a_c_cat_01', n = 'Gato' },
}

-- Atalhos de veículos no painel. Qualquer modelo pode ser digitado.
Config.Veiculos = {
    { categoria = 'Superesportivos', modelos = {
        { m = 'adder', n = 'Adder' }, { m = 'zentorno', n = 'Zentorno' }, { m = 't20', n = 'T20' },
        { m = 'osiris', n = 'Osiris' }, { m = 'nero', n = 'Nero' }, { m = 'italigtb', n = 'Itali GTB' },
        { m = 'tempesta', n = 'Tempesta' }, { m = 'entityxf', n = 'Entity XF' }, { m = 'cheetah', n = 'Cheetah' },
        { m = 'infernus', n = 'Infernus' }, { m = 'turismor', n = 'Turismo R' }, { m = 'vagner', n = 'Vagner' },
        { m = 'xa21', n = 'XA-21' }, { m = 'krieger', n = 'Krieger' }, { m = 'emerus', n = 'Emerus' },
    } },
    { categoria = 'Esportivos', modelos = {
        { m = 'comet2', n = 'Comet' }, { m = 'elegy2', n = 'Elegy RH8' }, { m = 'jester', n = 'Jester' },
        { m = 'sultanrs', n = 'Sultan RS' }, { m = 'banshee', n = 'Banshee' }, { m = 'specter', n = 'Specter' },
        { m = 'pariah', n = 'Pariah' }, { m = 'neon', n = 'Neon' }, { m = 'raiden', n = 'Raiden' },
        { m = 'kuruma', n = 'Kuruma' }, { m = 'feltzer2', n = 'Feltzer' }, { m = 'massacro', n = 'Massacro' },
        { m = 'carbonizzare', n = 'Carbonizzare' }, { m = 'ninef', n = '9F' }, { m = 'rapidgt', n = 'Rapid GT' },
    } },
    { categoria = 'Clássicos', modelos = {
        { m = 'ztype', n = 'Z-Type' }, { m = 'stinger', n = 'Stinger' }, { m = 'casco', n = 'Casco' },
        { m = 'btype', n = 'Roosevelt' }, { m = 'mamba', n = 'Mamba' }, { m = 'monroe', n = 'Monroe' },
        { m = 'cheetah2', n = 'Cheetah Classic' }, { m = 'infernus2', n = 'Infernus Classic' }, { m = 'torero', n = 'Torero' },
        { m = 'turismo2', n = 'Turismo Classic' }, { m = 'gt500', n = 'GT500' }, { m = 'jb700', n = 'JB 700' },
        { m = 'stirlinggt', n = 'Stirling GT' }, { m = 'retinue', n = 'Retinue' }, { m = 'michelli', n = 'Michelli GT' },
    } },
    { categoria = 'JDM / Tuner', modelos = {
        { m = 'futo', n = 'Futo' }, { m = 'elegy', n = 'Elegy Retro' }, { m = 'jester3', n = 'Jester Classic' },
        { m = 'zr350', n = 'ZR350' }, { m = 'calico', n = 'Calico GTF' }, { m = 'euros', n = 'Euros' },
        { m = 'futo2', n = 'Futo GTX' }, { m = 'remus', n = 'Remus' }, { m = 'rt3000', n = 'RT3000' },
        { m = 'sultan3', n = 'Sultan RS Classic' }, { m = 'comet6', n = 'Comet S2' }, { m = 'jester4', n = 'Jester RR' },
    } },
    { categoria = 'Muscle', modelos = {
        { m = 'dominator', n = 'Dominator' }, { m = 'gauntlet', n = 'Gauntlet' }, { m = 'sabregt', n = 'Sabre Turbo' },
        { m = 'dukes', n = 'Dukes' }, { m = 'vigero', n = 'Vigero' }, { m = 'phoenix', n = 'Phoenix' },
        { m = 'blade', n = 'Blade' }, { m = 'chino', n = 'Chino' }, { m = 'faction2', n = 'Faction Custom' },
    } },
    { categoria = 'Off-road e SUV', modelos = {
        { m = 'sandking', n = 'Sandking' }, { m = 'bifta', n = 'Bifta' }, { m = 'kamacho', n = 'Kamacho' },
        { m = 'rebel2', n = 'Rebel' }, { m = 'mesa3', n = 'Mesa (Merryweather)' }, { m = 'baller', n = 'Baller' },
    } },
    { categoria = 'Motos', modelos = {
        { m = 'bati', n = 'Bati 801' }, { m = 'hakuchou', n = 'Hakuchou' }, { m = 'akuma', n = 'Akuma' },
        { m = 'double', n = 'Double-T' }, { m = 'sanchez', n = 'Sanchez' }, { m = 'faggio', n = 'Faggio' },
        { m = 'avarus', n = 'Avarus' }, { m = 'daemon', n = 'Daemon' }, { m = 'sanctus', n = 'Sanctus' },
    } },
    { categoria = 'Outros', modelos = {
        { m = 'stretch', n = 'Limusine' }, { m = 'taxi', n = 'Táxi' }, { m = 'police', n = 'Polícia' },
        { m = 'ambulance', n = 'Ambulância' }, { m = 'firetruk', n = 'Bombeiros' }, { m = 'bus', n = 'Ônibus' },
    } },
}

-- Pontos de foto. A altura (z) é corrigida automaticamente para o chão.
-- Salve os seus pelo painel (aba Locais) — ficam disponíveis para todos.
Config.Locais = {
    { nome = 'Praça Legion (centro)', categoria = 'Cidade', x = 195.2, y = -933.8, z = 30.7, h = 144.0 },
    { nome = 'Topo do Maze Bank', categoria = 'Cidade', x = -75.0, y = -818.5, z = 326.2, h = 0.0 },
    { nome = 'Teatro Oriental (Vinewood Blvd)', categoria = 'Cidade', x = 293.1, y = 180.5, z = 104.3, h = 160.0 },
    { nome = 'Cassino Diamond', categoria = 'Cidade', x = 924.0, y = 47.0, z = 81.1, h = 58.0 },
    { nome = 'Grove Street', categoria = 'Cidade', x = 106.0, y = -1936.0, z = 20.8, h = 0.0 },
    { nome = 'Aeroporto (LSIA)', categoria = 'Cidade', x = -1336.0, y = -3044.0, z = 13.9, h = 240.0 },
    { nome = 'Píer de Del Perro (roda-gigante)', categoria = 'Litoral', x = -1850.1, y = -1231.8, z = 13.0, h = 320.0 },
    { nome = 'Praia de Vespucci (Muscle Sands)', categoria = 'Litoral', x = -1203.0, y = -1566.1, z = 4.6, h = 120.0 },
    { nome = 'Paleto Bay', categoria = 'Litoral', x = -275.5, y = 6635.8, z = 7.4, h = 45.0 },
    { nome = 'Farol de El Gordo', categoria = 'Litoral', x = 3430.2, y = 5174.2, z = 41.3, h = 90.0 },
    { nome = 'Letreiro de Vinewood', categoria = 'Montanha e natureza', x = 711.4, y = 1198.1, z = 348.5, h = 180.0 },
    { nome = 'Observatório Galileo', categoria = 'Montanha e natureza', x = -438.8, y = 1075.8, z = 352.4, h = 180.0 },
    { nome = 'Monte Chiliad (cume)', categoria = 'Montanha e natureza', x = 501.8, y = 5604.8, z = 797.9, h = 175.0 },
    { nome = 'Monte Gordo', categoria = 'Montanha e natureza', x = 2877.6, y = 5911.1, z = 369.6, h = 0.0 },
    { nome = 'Represa Land Act', categoria = 'Montanha e natureza', x = 1660.4, y = -12.0, z = 170.0, h = 0.0 },
    { nome = 'Acampamento Altruísta', categoria = 'Montanha e natureza', x = -1170.8, y = 4926.6, z = 224.3, h = 0.0 },
    { nome = 'Centro Kortz (museu)', categoria = 'Montanha e natureza', x = -2243.8, y = 264.0, z = 174.6, h = 0.0 },
    { nome = 'Aeródromo de Sandy Shores', categoria = 'Deserto e interior', x = 1747.0, y = 3273.7, z = 41.1, h = 105.0 },
    { nome = 'Base Fort Zancudo (pista)', categoria = 'Deserto e interior', x = -2047.4, y = 3132.1, z = 32.8, h = 60.0 },
    { nome = 'Casa do Michael', categoria = 'Casas famosas', x = -813.6, y = 179.5, z = 72.2, h = 110.0 },
    { nome = 'Casa do Franklin (Vinewood Hills)', categoria = 'Casas famosas', x = 7.1, y = 536.6, z = 176.0, h = 150.0 },
    { nome = 'Trailer do Trevor', categoria = 'Casas famosas', x = 1972.6, y = 3817.0, z = 33.4, h = 30.0 },
}
