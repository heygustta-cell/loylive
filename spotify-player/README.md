# Sonora — player de Spotify para Windows 11

Player desktop de Spotify com visual **Fluent Design do Windows 11** (Mica/Acrylic, barra de título com Snap Layouts,
tema e cor de destaque do sistema) que **toca as músicas sozinho**, sem o app oficial aberto: o próprio Sonora vira um
dispositivo Spotify Connect usando o **Web Playback SDK** com **Widevine** (Electron da castLabs).

- Electron **castLabs ECS v45.2.1+wvcus** (Widevine CDM) — `components.whenReady()` antes de abrir a janela
- **React 19 + TypeScript + Vite 8** (electron-vite) e **Fluent UI React v9** + Fluent Icons
- Login **OAuth 2.0 com PKCE** (sem client secret); tokens criptografados com DPAPI (`safeStorage`)
- Tocar/pausar, próxima/anterior, barra de progresso, volume, aleatório, repetir, busca, playlists,
  músicas curtidas, álbuns, artistas, fila, tela **Tocando agora** e integração com as teclas de mídia do Windows
- Visual premium: cabeçalhos imersivos que assumem as cores de cada capa (com barra compacta de vidro ao
  rolar), player flutuante de vidro com brilho na cor da música, banner "Continuar ouvindo", atalhos rápidos,
  "Tocando agora" com gradiente vivo e capa que "respira" ao pausar
- **Mini player** sempre visível (janela quadrada no canto da tela, como o do Media Player)
- Micro-interações com física de mola: play/pause que se transforma, coração que "explode", cartões com zoom,
  capa com inclinação 3D, prévia do tempo ao passar o mouse na barra de progresso
- Animações só com `transform`/`opacity` e `requestAnimationFrame` (fluido em 144 Hz); respeita
  "Reduzir animações" do app e do Windows

---

## ⚡ Instalação rápida (Windows)

1. Baixe o projeto (botão **Code → Download ZIP** no GitHub), extraia e copie a pasta `spotify-player` para um
   caminho curto, por exemplo `C:\Sonora`.
2. Dê dois cliques em **`instalar.cmd`**. Ele instala o que faltar (Node.js, Git, Python via `winget`), pede o
   Client ID do Spotify, instala as dependências e faz a assinatura VMP (castLabs EVS) — tudo guiado em português.
   Se ele instalar algum programa, feche a janela e rode o `instalar.cmd` de novo.
3. Para abrir o app depois: **`iniciar.cmd`**. Para gerar um instalador de verdade: **`criar-instalador.cmd`**.

As seções abaixo explicam cada etapa em detalhe (e o que fazer se algo der errado).

---

## 1. Pré-requisitos

| Item | Observação |
| --- | --- |
| **Windows 11 22H2+** | Mica/Acrylic exigem o build 22621 ou superior (no Windows 10 o app usa fundo sólido). |
| **Node.js 22.12+** (LTS 22 ou 24) | <https://nodejs.org> |
| **Git** | O `npm install` baixa o Electron da castLabs do GitHub. |
| **Python 3.8+** | Para a assinatura VMP (castLabs EVS). Marque *Add python.exe to PATH* no instalador. |
| **Spotify Premium** | O Web Playback SDK só funciona com Premium. |

---

## 2. Criar o app no Spotify Developer Dashboard

1. Acesse <https://developer.spotify.com/dashboard> e clique em **Create app**.
2. Preencha nome e descrição (qualquer coisa, ex.: "Sonora").
3. Em **Redirect URIs** adicione **exatamente**:

   ```
   http://127.0.0.1:5173/callback
   ```

   > Você **não** precisa de nenhum servidor nessa porta: a janela de login do Sonora intercepta esse redirecionamento.
   > (O Spotify não aceita mais `localhost`; por isso é `127.0.0.1`.)
4. Em **Which API/SDKs are you planning to use?** marque **Web API** e **Web Playback SDK**.
5. Salve e copie o **Client ID** (não use o *Client secret* — o PKCE não precisa dele).

> Apps em *Development Mode* exigem que o **dono do app tenha Premium**. Se for usar com outra conta Spotify,
> adicione o e-mail dela em **User Management** no Dashboard.

---

## 3. Onde colocar o Client ID

Escolha **uma** das opções:

**Opção A — arquivo `.env` (recomendado para desenvolvimento)**

```powershell
cd spotify-player
copy .env.example .env
notepad .env
```

E deixe assim:

```
MAIN_VITE_SPOTIFY_CLIENT_ID=cole_aqui_o_seu_client_id
```

**Opção B — pela interface**: abra o app e cole o Client ID na tela de boas-vindas
(fica salvo em `%APPDATA%\Sonora\settings.json`; dá para trocar depois em **Configurações → Conta do Spotify**).
Se as duas existirem, a da interface tem prioridade.

---

## 4. Instalar

```powershell
cd spotify-player
npm install
```

O `postinstall` baixa o binário do Electron castLabs com Widevine (~110 MB) para `node_modules\electron\dist`.

---

## 5. VMP (Verified Media Path): é necessário? **Sim.**

No Windows e no macOS o Widevine usa **VMP**: o servidor de licenças verifica se o executável que pede a licença está
assinado. Os builds da castLabs vêm com uma assinatura **de desenvolvimento**, aceita apenas por servidores de teste
(UAT). O servidor de licenças do Spotify é de **produção**: sem a assinatura VMP de produção, o Sonora aparece como
dispositivo e carrega a faixa, mas a licença é recusada (`playback_error`, HTTP 403/500 em
`widevine-license`). O app mostra o aviso **"Licença de reprodução recusada"** quando isso acontece.

A assinatura de produção é **gratuita**, pelo serviço **EVS** da castLabs. Passo a passo:

1. **Instale o cliente EVS:**

   ```powershell
   python -m pip install --upgrade castlabs-evs
   ```

2. **Crie sua conta EVS** (uma vez — pede e-mail, nome, organização (pode ser pessoal), nome da conta e senha, e envia
   um código de confirmação por e-mail):

   ```powershell
   python -m castlabs_evs.account signup
   ```

   Depois, para entrar de novo (o login expira periodicamente):

   ```powershell
   python -m castlabs_evs.account reauth
   ```

3. **Assine o Electron de desenvolvimento** (o que o `npm run dev` usa):

   ```powershell
   npm run vmp:sign-dev
   npm run vmp:verify-dev
   ```

   (equivalem a `python -m castlabs_evs.vmp sign-pkg node_modules\electron\dist` e `verify-pkg`.)

   ⚠️ Refaça este passo **sempre que o Electron for baixado de novo** (novo `npm install` que reinstale o Electron,
   troca de versão, apagar `node_modules`).

4. **No instalador** (`npm run dist:win`) a assinatura é automática pelos hooks do electron-builder
   (`scripts/evs-sign.cjs`): sem certificado de código ela roda no `afterPack`; se você tiver certificado
   (`CSC_LINK`), roda no `afterSign` — a castLabs exige que, no Windows, o VMP venha **depois** do Authenticode.

5. **Conferir:** em **Configurações → DRM e diagnóstico → Testar VMP** abre o *castLabs VMP Lab* dentro do próprio app.
   Clique em **Load Content**: `PLATFORM_SECURE_STORAGE_SOFTWARE_VERIFIED` = VMP ativo; `PLATFORM_UNVERIFIED` = sem VMP.

Dicas:
- A assinatura padrão (*streaming*) é a correta; licença persistente não é necessária.
- Rode o app a partir de um terminal comum (PowerShell/Windows Terminal). Há relato de licença recusada quando o
  Electron é iniciado por ferramentas empacotadas como MSIX, que redirecionam o `AppData`.

---

## 6. Rodar

```powershell
npm run dev
```

- Na **primeira execução** aparece "Preparando o Widevine (DRM)…": o CDM é baixado dos servidores de componentes do
  Google (precisa de internet). A janela principal só abre depois de `components.whenReady()`.
- Faça login (**Entrar com o Spotify**). Se você usa *Continuar com Google/Apple/Facebook*, prefira
  **Entrar pelo navegador**.
- Ao abrir, a reprodução da sua conta é **transferida automaticamente** para o Sonora (dá para desligar em
  Configurações). O dispositivo aparece como **"Sonora"** no Spotify Connect.

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com recarga automática (renderer em `http://127.0.0.1:5180`). |
| `npm run build` | Checa tipos e gera o build de produção em `out/`. |
| `npm start` | Abre o build de produção. |
| `npm run dist:win` | Gera o instalador `dist\Sonora-Setup-1.0.0.exe` (com assinatura VMP). |
| `npm run typecheck` | Só a checagem de tipos. |

---

## 7. Atalhos

| Tecla | Ação |
| --- | --- |
| `Espaço` | Tocar / pausar |
| `Ctrl` + `→` / `←` | Próxima / anterior |
| `Ctrl` + `↑` / `↓` | Volume |
| `Ctrl` + `F` | Buscar |
| `Alt` + `←` ou botão "voltar" do mouse | Voltar |
| `Esc` | Fechar "Tocando agora" / sair da tela cheia |
| Botão ⧉ no player | Mini player (o botão no canto do mini volta ao app completo) |
| Duplo clique numa faixa | Tocar a partir dela |
| Botão direito numa faixa | Fila, álbum, artista, curtir, copiar link |
| `F12` | DevTools (diagnóstico) |

As **teclas de mídia** do teclado e o painel de mídia do Windows funcionam pela integração `enableMediaSession` do SDK.

---

## 8. Solução de problemas

| Sintoma | Causa provável / solução |
| --- | --- |
| "Widevine (DRM) indisponível" | O CDM ainda não baixou (sem internet/firewall bloqueando servidores do Google). Quando terminar, a interface recarrega sozinha. Confirme que o `electron` instalado é o da castLabs (`npm ls electron` → `45.2.1+wvcus`). |
| "Licença de reprodução recusada" | Falta a assinatura **VMP** — veja a seção 5. |
| "Conta sem Premium" | O SDK exige Spotify Premium. |
| `INVALID_CLIENT: Invalid redirect URI` | Cadastre exatamente `http://127.0.0.1:5173/callback` no Dashboard. |
| "Client ID inválido" | Confira o valor copiado (é o *Client ID*, não o *secret*). |
| "A porta 5173 está em uso" (login pelo navegador) | Outro programa usa a porta; feche-o ou use **Entrar com o Spotify** (janela do app). |
| Porta 5180 ocupada no `npm run dev` | Feche o outro processo (o servidor do Vite usa `strictPort`). |
| Algumas playlists dão "acesso negado" | Apps em *Development Mode* não podem abrir playlists editoriais/algorítmicas do próprio Spotify. |
| Login com Google fica em branco/recusado | Use **Entrar pelo navegador**. |

---

## 9. Como funciona (arquitetura)

```
spotify-player/
├─ electron.vite.config.ts     # build do main/preload/renderer (renderer em 127.0.0.1:5180)
├─ electron-builder.yml        # instalador NSIS usando o Electron castLabs + hooks de VMP
├─ scripts/evs-sign.cjs        # assinatura VMP (castLabs EVS) no empacotamento
├─ src/
│  ├─ main/                    # processo principal (Node)
│  │  ├─ index.ts              # flags do Chromium, Widevine → janela Mica + titleBarOverlay, IPC
│  │  ├─ drm.ts                # components.whenReady() com timeout e diagnóstico
│  │  ├─ auth.ts               # OAuth PKCE (janela de login c/ interceptação ou navegador), refresh, safeStorage
│  │  ├─ theme.ts              # tema claro/escuro, cor de destaque, Mica/Acrylic, botões nativos
│  │  ├─ settings.ts           # configurações em %APPDATA%\Sonora\settings.json
│  │  └─ rendererServer.ts     # em produção, serve a interface em http://127.0.0.1 (não file://)
│  ├─ preload/index.ts         # ponte segura (contextBridge) → window.sonora
│  ├─ shared/                  # tipos e canais IPC compartilhados
│  └─ renderer/src/            # React + Fluent UI
│     ├─ spotify/              # Web API (com compatibilidade fev/2026), React Query, Web Playback SDK
│     ├─ components/           # barra de título, navegação, player, lista virtualizada, Tocando agora…
│     ├─ pages/                # Início, Buscar, Curtidas, Álbuns, Playlists, Álbum, Artista, Fila, Config.
│     ├─ theme/                # tema Fluent gerado a partir da cor de destaque do Windows
│     └─ lib/                  # paleta da capa, efeito Reveal, rAF, FLIP da navegação
```

Decisões importantes:

- **Widevine primeiro**: o CDM precisa estar registrado antes de existir a janela que usa EME; por isso a janela só
  é criada após `components.whenReady()` (com timeout de 45 s para não travar sem internet).
- **Origem http://127.0.0.1** em dev e produção: o SDK conversa com um iframe via `postMessage`, e `file://` tem
  origem `null`. Em produção um servidor estático mínimo (somente loopback) serve a interface.
- **Login no processo principal**: o verifier PKCE e os tokens nunca ficam no renderer; o refresh é automático e
  deduplicado. A janela de login usa um User-Agent de Chrome e intercepta a Redirect URI via `webRequest`.
- **Material do Windows**: `backgroundMaterial` (`mica` padrão; `tabbed` = Mica Alt; `acrylic`) com fundo
  `#00000000` e `titleBarStyle: 'hidden'` + `titleBarOverlay` transparente (botões nativos e Snap Layouts). A cor dos
  botões acompanha o tema e fica branca na tela "Tocando agora".
- **Fluidez em 144 Hz**: progresso e sliders atualizam o DOM direto em `requestAnimationFrame` (sem re-render do
  React), listas longas são virtualizadas, o fundo desfocado é pré-renderizado num canvas pequeno (nada de `blur()`
  animado), trocas de cor são crossfades de `opacity`, o recolher da navegação é uma animação FLIP com `transform`.

### Sobre as mudanças da Web API (fevereiro de 2026)

Apps em *Development Mode* passaram a ter endpoints e campos novos (ex.: `/playlists/{id}/items`, campo `item` no
lugar de `track`, biblioteca unificada em `/me/library`; `email`/`product` saíram de `/me`; vários endpoints de
"browse" foram removidos). O cliente (`src/renderer/src/spotify/api.ts`) tenta o formato novo e, se o Spotify
recusar, usa o antigo — memorizando o que funcionou. Limites máximos menores (ex.: busca) também são tratados.

---

Projeto pessoal, não afiliado ao Spotify. "Spotify" é marca da Spotify AB.
