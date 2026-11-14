# 📷 Servidor de Fotografia para GTA V (FiveM)

Um servidor **sem RP**: ninguém morre, não tem polícia, não tem trabalho nem dinheiro.
Você entra, escolhe o visual, monta a cena e fotografa, sozinho ou com amigos posando.

## O que tem

| Aba do painel (F7) | O que faz |
|---|---|
| **Câmera** | Câmera livre que voa pelo mapa, zoom com equivalente em mm, inclinação do horizonte, tremor de mão, **desfoque de fundo (profundidade de campo)** com foco automático, grade dos terços, barras de proporção (1:1, 4:5 Instagram, 9:16 Stories, 3:2, 16:9, cinema 2.39:1), esconder você e os outros, 3 posições de câmera salvas |
| **Ambiente** | Horário com atalhos (amanhecer, hora dourada, hora azul…), congelar o relógio, 15 climas, formatos de nuvem, vento, **apagão** (ver estrelas), trânsito e pedestres de 0 a 100%, limpar NPCs da área. Vale para todos, ou “Só pra mim” |
| **Filtros** | 49 filtros de cor (Rockstar Editor, Snapmatic, preto e branco, cinema…) com intensidade, mais uma segunda camada (saturação, contraste, brilho, vinheta) |
| **Luzes** | **Luzes de estúdio**: spots e lâmpadas onde a câmera estiver, com cor, intensidade, alcance, abertura do cone e sombras. Até 12 |
| **Poses** | 57 poses (em pé, gestos, sentado, deitado, ação), congelar a pose, girar o personagem, expressões do rosto, qualquer animação do GTA |
| **Visual** | Masculino/feminino customizável (herança, traços do rosto, cabelo, maquiagem, barba), roupas e acessórios, protagonistas, NPCs e **cachorros/gato**, 3 looks salvos |
| **Veículo** | Criar qualquer carro, pintura RGB com acabamento (fosco, cromado…), rodas, insulfilm, placa, faróis, xenon colorido, neon, portas abertas, tunar no máximo, sujeira, travar no lugar |
| **Locais** | 22 pontos de foto prontos, ir ao marcador do mapa, **salvar lugares para a galera**, ir até outro jogador |

---

## Do que você precisa

- **GTA V original** no PC (Steam, Epic ou Rockstar). O FiveM roda na versão **Legacy** do GTA V; se você tem a *Enhanced*, instale também a Legacy (vem junto na sua conta).
- **FiveM** instalado: <https://fivem.net>
- Uma **chave de servidor grátis**: entre em <https://portal.cfx.re> com a conta do FiveM › *Servers* › *Registration Keys* › gere uma chave (pode colocar o seu IP ou deixar o que o site sugerir).
- Para hospedar no seu PC: Windows 10/11. Ele aguenta tranquilo o jogo e o servidor ao mesmo tempo.

## Instalação (Windows)

1. Baixe esta pasta `servidor-fotografia` inteira para um lugar fácil, por exemplo `C:\servidor-fotografia`.
2. Dê dois cliques em **`instalar.bat`**. Ele baixa o programa do servidor e os recursos básicos e pede a sua chave (cole e aperte Enter).
   - Se ele pedir para extrair o `server.7z` na mão, instale o [7-Zip](https://www.7-zip.org) e rode de novo.
3. Dê dois cliques em **`iniciar.bat`**. Quando aparecer `fotografia pronto!` na janela, o servidor está no ar. **Deixe essa janela aberta.**
4. Abra o FiveM, aperte **F8** e digite:
   ```
   connect localhost
   ```

> Prefere painel web? Rode `artefatos\FXServer.exe` sozinho: abre o **txAdmin** no navegador. Escolha “Existing Server Data” e aponte para esta pasta.

### No Linux / VPS

```bash
./instalar.sh
./iniciar.sh
```

## Chamando os amigos

- **Mesma casa / mesma rede:** eles usam `connect IP-DO-SEU-PC` (veja o IP com `ipconfig`, algo como `192.168.0.10`).
- **Pela internet:** libere a porta **30120 TCP e UDP** no roteador apontando para o seu PC e passe seu IP público. Sem acesso ao roteador? Usem uma VPN de jogos tipo **Radmin VPN** ou **ZeroTier** e conectem pelo IP que ela mostrar.
- **Servidor privado:** em `resources/fotografia/config.lua`, coloque uma senha em `Config.Senha = 'suasenha'`. Para sumir da lista pública, tire o `#` da linha `sv_master1 ""` no `server.cfg`.

---

## Controles

| Tecla | Ação |
|---|---|
| **F7** | Abre/fecha o painel |
| **F6** | Liga/desliga a câmera livre |
| **W A S D** | Mover a câmera |
| **Espaço / Ctrl** (ou E / Q) | Subir / descer |
| **Shift / Alt** | Mais rápido / mais devagar (precisão) |
| **Mouse** | Olhar |
| **Rodinha** ou **PgUp / PgDn** | Zoom |
| **Z / C** | Inclinar o horizonte · **R** endireita |
| **F** | Focar no que está no centro da tela |
| **G** | Grade dos terços |
| **L** | Criar uma luz onde a câmera está |
| **H** | **Esconder toda a interface** (use antes de tirar a foto) |

F6 e F7 podem ser trocadas em *Configurações › Teclas › FiveM*.

### Comandos no chat (T)

| Comando | Exemplo |
|---|---|
| `/foto` · `/painel` · `/fotoajuda` | |
| `/carro modelo` · `/dv` · `/reparar` | `/carro elegy2` |
| `/hora H M` · `/congelar` · `/clima nome` | `/hora 19 30` · `/clima foggy` |
| `/tp` (marcador do mapa) · `/ir ID` · `/local nome` · `/salvarlocal nome` | `/local chiliad` |
| `/e pose` · `/e parar` · `/anim dicionário animação` | `/e cruzar` · `/e` lista tudo |
| `/filtro nome força` · `/filtro limpar` | `/filtro NG_filmic05 0.8` |
| `/modelo nome` · `/luz` · `/luz ponto` · `/limparluzes` | `/modelo a_c_husky` |

---

## Para fotos bonitas

**Configurações gráficas do GTA** (Configurações › Gráficos e Gráficos avançados):
- **Pós-processamento: Muito alto ou Ultra** e **Efeitos de profundidade de campo: Ligado**. Sem isso o desfoque de fundo não aparece.
- Qualidade de sombras e de reflexos no máximo que o seu PC aguentar; “Sombras suaves” em *Mais suave*.
- Use o jogo em **Janela sem bordas**: assim qualquer ferramenta de captura funciona.

**Como tirar a foto** (o FiveM não salva fotos sozinho):
- `Win + Shift + S` (Recorte do Windows) ou `Win + Alt + PrtScn` (Xbox Game Bar, salva em *Vídeos › Capturas*).
- NVIDIA: `Alt + F1` · AMD: `Ctrl + Shift + I`.
- Antes de capturar, aperte **H** para sumir com toda a interface.

**Fluxo que funciona bem:**
1. Ambiente: escolha a hora (hora dourada ~19h, hora azul ~21h), congele o relógio, ajuste o clima e zere o trânsito se quiser ruas vazias.
2. Pose: posicione o modelo, escolha a pose, congele e gire para a câmera.
3. Câmera: F6, enquadre, ligue o desfoque, aperte **F** mirando no rosto, escolha a proporção do post.
4. Luzes: com a câmera do lado do rosto, aperte **L** para uma luz de preenchimento; ajuste a cor (quente/fria) no painel.
5. Filtro: um toque de “Editor” ou “Cinema” em 40–70% costuma ficar mais natural que 100%.
6. **H** e capture.

---

## Personalizando

Tudo fica em **`resources/fotografia/config.lua`** (é só texto, abre no Bloco de Notas):
- `Config.Spawn`: onde as pessoas aparecem ao entrar.
- `Config.Senha`: senha de entrada.
- `Config.Ambiente`: clima e horário iniciais, trânsito, e `SoAdminPodeMudar` (só admins mudam o clima de todos).
- Listas de **poses**, **filtros**, **veículos**, **modelos** e **pontos de foto**: copie uma linha e mude.

Depois de editar, no console do servidor digite `restart fotografia` (ou feche e abra o `iniciar.bat`).

**Virar admin:** quando você entra, o console mostra algo como `identificador: license:abc123`. No `server.cfg`, na linha `#add_principal identifier.license:COLE_AQUI group.admin`, troque `COLE_AQUI` por `abc123` (a parte depois de `license:`) e tire o `#`. Admin pode remover qualquer local salvo e mudar o clima mesmo com `SoAdminPodeMudar = true`.

Looks e locais salvos ficam em `resources/fotografia/data/` (arquivos `.json`). Faça backup deles se for trocar de PC.

## Problemas comuns

| Problema | Solução |
|---|---|
| Janela do servidor fecha na hora | Falta o `chave.cfg` ou a chave está errada. Gere outra em portal.cfx.re |
| “Couldn't find resource fotografia” | Confira se a pasta é `resources/fotografia` (com `fxmanifest.lua` dentro) |
| Primeira vez demora muito para abrir | Normal: o recurso de chat é montado na primeira vez e o jogo baixa a versão do GTA definida em `sv_enforceGameBuild` |
| Desfoque não aparece | Pós-processamento em Muito alto/Ultra e profundidade de campo ligada nos gráficos |
| Um filtro não muda nada | Alguns nomes só existem em certas versões do jogo; teste outro ou digite um nome no campo “Outro filtro” |
| Carro “não existe nesta versão” | Ele é de uma DLC mais nova. Aumente `sv_enforceGameBuild` no `server.cfg` (ex.: 3407) |
| Ponto de foto caiu num lugar estranho | As coordenadas são aproximadas: vá ao lugar certo e use **Salvar onde estou** |
| Amigos não conseguem entrar | Porta 30120 TCP **e** UDP liberada no roteador e no Firewall do Windows (ou usem Radmin VPN) |

## Estrutura

```
servidor-fotografia/
├── LEIAME.md              este guia
├── server.cfg             configuração do servidor
├── chave.cfg.exemplo      modelo para a sua chave (o chave.cfg não vai pro Git)
├── instalar.bat / .ps1    instalador Windows
├── iniciar.bat            liga o servidor no Windows
├── instalar.sh / iniciar.sh   o mesmo para Linux
└── resources/
    └── fotografia/        o modo de jogo
        ├── config.lua     ← tudo o que dá para personalizar
        ├── client/        câmera, ambiente, luzes, poses, personagem, veículo, locais
        ├── server/        clima sincronizado, senha, looks e locais salvos
        ├── html/          o painel (F7)
        └── data/          looks e locais salvos pelos jogadores
```
