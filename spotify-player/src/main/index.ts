import { app, BrowserWindow, ipcMain, Menu, nativeTheme, screen, session, shell, systemPreferences } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { IPC } from '@shared/ipc'
import type { AppSettings, LoginMode, OverlayTone } from '@shared/types'
import { auth, chromeUserAgent } from './auth'
import { drm } from './drm'
import { settings } from './settings'
import { startRendererServer } from './rendererServer'
import {
  applyMaterial,
  applyThemeSource,
  materialSupported,
  systemTheme,
  titleBarOverlay
} from './theme'

// ─── Flags do Chromium (antes do "ready") ────────────────────────────────────────────────
// Permite que o Web Playback SDK comece a tocar sem exigir um clique na página.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
// Rasterização e composição na GPU para animações estáveis em 144 Hz.
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
// Barras de rolagem no estilo Windows 11 (finas, que expandem ao passar o mouse).
app.commandLine.appendSwitch('enable-features', 'FluentOverlayScrollbar,FluentScrollbar')

app.setName('Sonora')
if (process.platform === 'win32') app.setAppUserModelId('com.sonora.player')

const isDev = !app.isPackaged && Boolean(process.env.ELECTRON_RENDERER_URL)

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null
let splash: BrowserWindow | null = null
let rendererUrl = ''
let overlayTone: OverlayTone = 'auto'
/** Estado salvo ao entrar no mini player (para restaurar a janela normal). */
let miniState: { bounds: Electron.Rectangle; maximized: boolean } | null = null
const MIN_SIZE = { width: 920, height: 620 }
const MINI_SIZE = 320

// ─── Estado da janela (posição/tamanho) ───────────────────────────────────────────────────
interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  maximized: boolean
}
const windowStateFile = (): string => join(app.getPath('userData'), 'window.json')

function loadWindowState(): WindowState {
  const fallback: WindowState = { width: 1320, height: 860, maximized: false }
  try {
    if (!existsSync(windowStateFile())) return fallback
    const s = JSON.parse(readFileSync(windowStateFile(), 'utf-8')) as WindowState
    if (s.x !== undefined && s.y !== undefined) {
      const visible = screen.getAllDisplays().some(({ workArea: a }) => {
        return s.x! < a.x + a.width - 100 && s.x! + s.width > a.x + 100 && s.y! >= a.y - 10 && s.y! < a.y + a.height - 100
      })
      if (!visible) return { ...fallback, maximized: s.maximized }
    }
    return { ...fallback, ...s }
  } catch {
    return fallback
  }
}

function saveWindowState(win: BrowserWindow): void {
  try {
    // No mini player, salva o tamanho "normal" anterior, não a janelinha.
    const b = miniState?.bounds ?? win.getNormalBounds()
    const state: WindowState = { ...b, maximized: miniState?.maximized ?? win.isMaximized() }
    writeFileSync(windowStateFile(), JSON.stringify(state))
  } catch {
    /* ignora */
  }
}

// ─── Janelas ─────────────────────────────────────────────────────────────────────────────
function broadcast(channel: string, ...args: unknown[]): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, ...args)
  }
}

function showSplash(): void {
  if (splash || mainWindow) return
  const dark = nativeTheme.shouldUseDarkColors
  splash = new BrowserWindow({
    width: 380,
    height: 190,
    resizable: false,
    maximizable: false,
    minimizable: false,
    show: false,
    center: true,
    title: 'Sonora',
    titleBarStyle: 'hidden',
    backgroundColor: materialSupported() ? '#00000000' : dark ? '#202020' : '#f3f3f3',
    backgroundMaterial: materialSupported() ? 'mica' : undefined,
    webPreferences: { sandbox: true, contextIsolation: true }
  })
  const accent = dark ? '#60cdff' : '#005fb8'
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  :root{color-scheme:${dark ? 'dark' : 'light'}}
  html,body{margin:0;height:100%;background:transparent;font-family:"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;color:${dark ? '#fff' : '#1a1a1a'};-webkit-app-region:drag;user-select:none;overflow:hidden}
  body{display:grid;place-items:center}
  .c{display:flex;flex-direction:column;align-items:center;gap:14px;animation:in .7s cubic-bezier(.16,1,.3,1)}
  .logo{position:relative;width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#0078d4,#004aa0);display:flex;align-items:center;justify-content:center;gap:5px;box-shadow:0 14px 34px -10px ${accent}}
  .logo::before{content:"";position:absolute;inset:-26px;border-radius:50%;background:radial-gradient(closest-side,${accent},transparent);opacity:.35;z-index:-1;animation:g 2.4s ease-in-out infinite}
  .logo i{width:6px;height:30px;border-radius:3px;background:#fff;transform-origin:50% 50%;animation:b 1s ease-in-out infinite;will-change:transform}
  .logo i:nth-child(1){animation-delay:-.2s;height:14px}.logo i:nth-child(2){animation-delay:-.5s}.logo i:nth-child(3){animation-delay:-.1s;height:22px}.logo i:nth-child(4){animation-delay:-.7s;height:34px}.logo i:nth-child(5){animation-delay:-.35s;height:10px}
  h1{margin:6px 0 0;font:700 22px "Segoe UI Variable Display","Segoe UI",sans-serif;letter-spacing:-.01em}
  p{margin:0;font-size:12px;opacity:.65}
  @keyframes b{0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1)}}
  @keyframes g{0%,100%{opacity:.25}50%{opacity:.5}}
  @keyframes in{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
  </style></head><body><div class="c"><div class="logo"><i></i><i></i><i></i><i></i><i></i></div><h1>Sonora</h1><p>Preparando o Widevine (DRM)…</p></div></body></html>`
  void splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  splash.once('ready-to-show', () => splash?.show())
  splash.on('closed', () => (splash = null))
}

function createMainWindow(): BrowserWindow {
  const s = settings.get()
  const state = loadWindowState()
  const supported = materialSupported()
  const dark = nativeTheme.shouldUseDarkColors

  const win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    show: false,
    title: 'Sonora',
    icon: join(__dirname, '../../resources/icon.png'),
    // Fundo totalmente transparente para o material do Windows 11 (Mica/Acrylic) aparecer.
    backgroundColor: supported ? '#00000000' : dark ? '#202020' : '#f3f3f3',
    backgroundMaterial: supported && s.material !== 'none' ? s.material : undefined,
    // Barra de título personalizada + botões nativos (com Snap Layouts no "maximizar").
    titleBarStyle: 'hidden',
    titleBarOverlay: titleBarOverlay(overlayTone),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      // O SDK precisa continuar rodando com a janela minimizada.
      backgroundThrottling: false
    }
  })

  if (state.maximized) win.maximize()

  win.once('ready-to-show', () => {
    win.show()
    splash?.close()
  })

  win.on('close', () => saveWindowState(win))
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })
  win.on('enter-full-screen', () => win.webContents.send(IPC.windowFullscreen, true))
  win.on('leave-full-screen', () => win.webContents.send(IPC.windowFullscreen, false))
  win.on('maximize', () => win.webContents.send(IPC.windowMaximized, true))
  win.on('unmaximize', () => win.webContents.send(IPC.windowMaximized, false))

  // Links externos abrem no navegador padrão; nada de janelas novas dentro do app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(rendererUrl)) {
      event.preventDefault()
      if (/^https:\/\//i.test(url)) void shell.openExternal(url)
    }
  })

  // F12 / Ctrl+Shift+I abrem o DevTools (útil para diagnosticar o DRM); Ctrl+R recarrega no modo dev.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const key = input.key.toLowerCase()
    if (key === 'f12' || (input.control && input.shift && key === 'i')) {
      win.webContents.toggleDevTools()
      event.preventDefault()
    } else if (isDev && input.control && key === 'r') {
      win.webContents.reload()
      event.preventDefault()
    }
  })

  void win.loadURL(rendererUrl)
  return win
}

// ─── Sessão: CORS para as capas (extração de cores) e User-Agent ─────────────────────────
function configureSession(): void {
  const ses = session.defaultSession
  // UA de Chrome sem "Electron/…": o Spotify trata o app como um navegador comum.
  ses.setUserAgent(chromeUserAgent())

  // As capas do Spotify são lidas num <canvas> para extrair a paleta; garantimos o cabeçalho CORS.
  const imageHosts = [
    'https://i.scdn.co/*',
    'https://mosaic.scdn.co/*',
    'https://*.spotifycdn.com/*',
    'https://lineup-images.scdn.co/*',
    'https://seeded-session-images.scdn.co/*'
  ]
  ses.webRequest.onHeadersReceived({ urls: imageHosts }, (details, callback) => {
    const headers = { ...(details.responseHeaders ?? {}) }
    const has = Object.keys(headers).some((k) => k.toLowerCase() === 'access-control-allow-origin')
    if (!has) headers['Access-Control-Allow-Origin'] = ['*']
    callback({ responseHeaders: headers })
  })
}

// ─── IPC ─────────────────────────────────────────────────────────────────────────────────
function registerIpc(): void {
  ipcMain.on(IPC.systemInitial, (event) => {
    event.returnValue = { theme: systemTheme(), settings: settings.get() }
  })

  ipcMain.handle(IPC.settingsGet, () => settings.get())
  ipcMain.handle(IPC.settingsSet, (_e, patch: Partial<AppSettings>) => settings.set(patch))

  ipcMain.handle(IPC.authState, () => auth.state())
  ipcMain.handle(IPC.authLogin, (_e, mode: LoginMode) => auth.login(mode === 'browser' ? 'browser' : 'window', mainWindow))
  ipcMain.handle(IPC.authLogout, () => auth.logout())
  ipcMain.handle(IPC.authToken, async () => {
    try {
      return { token: await auth.getAccessToken() }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.drmStatus, () => drm.status())
  // O VMP Lab precisa abrir DENTRO do app (no Electron castLabs) para testar a assinatura VMP deste build.
  ipcMain.handle(IPC.drmOpenVmpLab, () => {
    const lab = new BrowserWindow({
      width: 1100,
      height: 800,
      title: 'castLabs VMP Lab — teste de VMP do Sonora',
      autoHideMenuBar: true,
      parent: mainWindow ?? undefined,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
    })
    lab.setMenu(null)
    lab.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https:\/\//i.test(url)) void shell.openExternal(url)
      return { action: 'deny' }
    })
    void lab.loadURL('https://castlabs.github.io/wv-vmp-lab/')
  })

  ipcMain.on(IPC.windowOverlayTone, (event, tone: OverlayTone) => {
    overlayTone = tone
    const win = BrowserWindow.fromWebContents(event.sender)
    if (miniState) return // o mini player mantém os botões claros sobre a capa
    try {
      win?.setTitleBarOverlay(titleBarOverlay(tone))
    } catch {
      /* plataforma sem overlay */
    }
  })
  ipcMain.on(IPC.windowToggleFullscreen, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && !miniState) win.setFullScreen(!win.isFullScreen())
  })

  // Mini player: mesma janela (o Web Playback SDK continua tocando), só que pequena e sempre no topo.
  ipcMain.on(IPC.windowMini, (event, on: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    try {
      if (on && !miniState) {
        miniState = { bounds: win.getNormalBounds(), maximized: win.isMaximized() }
        if (win.isFullScreen()) win.setFullScreen(false)
        if (win.isMaximized()) win.unmaximize()
        win.setMinimumSize(240, 240)
        const { workArea } = screen.getDisplayMatching(win.getBounds())
        win.setBounds({
          x: workArea.x + workArea.width - MINI_SIZE - 24,
          y: workArea.y + workArea.height - MINI_SIZE - 24,
          width: MINI_SIZE,
          height: MINI_SIZE
        })
        win.setAspectRatio(1)
        win.setMaximizable(false)
        win.setAlwaysOnTop(true, 'floating')
        win.setTitleBarOverlay({ ...titleBarOverlay('dark'), height: 32 })
      } else if (!on && miniState) {
        const restore = miniState
        miniState = null
        win.setAlwaysOnTop(false)
        win.setAspectRatio(0)
        win.setMaximizable(true)
        win.setMinimumSize(MIN_SIZE.width, MIN_SIZE.height)
        win.setBounds(restore.bounds)
        if (restore.maximized) win.maximize()
        win.setTitleBarOverlay(titleBarOverlay(overlayTone))
      }
    } catch (err) {
      console.warn('[mini] falha ao alternar o mini player:', err)
    }
    win.webContents.send(IPC.windowMiniChanged, Boolean(miniState))
  })

  ipcMain.handle(IPC.openExternal, (_e, url: string) => {
    if (typeof url === 'string' && /^https:\/\//i.test(url)) return shell.openExternal(url)
    return undefined
  })
}

function watchSystem(): void {
  const pushTheme = (): void => {
    broadcast(IPC.systemTheme, systemTheme())
    if (overlayTone === 'auto' && mainWindow && !miniState) {
      try {
        mainWindow.setTitleBarOverlay(titleBarOverlay('auto'))
      } catch {
        /* ignora */
      }
    }
  }
  nativeTheme.on('updated', pushTheme)
  if (process.platform === 'win32') {
    systemPreferences.on('accent-color-changed', pushTheme)
    systemPreferences.on('color-changed', pushTheme)
  }

  settings.on('change', (next: AppSettings, prev: AppSettings) => {
    broadcast(IPC.settingsChanged, next)
    if (next.theme !== prev.theme) applyThemeSource(next.theme)
    if (next.material !== prev.material && mainWindow) applyMaterial(mainWindow, next.material)
    if (next.clientId !== prev.clientId) auth.notifyClientIdChanged()
  })

  auth.on('change', (state) => broadcast(IPC.authChanged, state))
  drm.on('ready', () => broadcast(IPC.drmReady, drm.status()))
}

// ─── Inicialização ───────────────────────────────────────────────────────────────────────
app.on('second-instance', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  app.userAgentFallback = chromeUserAgent()

  settings.load()
  auth.load()
  applyThemeSource(settings.get().theme)
  configureSession()
  registerIpc()
  watchSystem()

  // Servidor do front-end: Vite em dev, servidor estático em 127.0.0.1 em produção.
  if (isDev) {
    rendererUrl = process.env.ELECTRON_RENDERER_URL!
  } else {
    const { url } = await startRendererServer(join(__dirname, '../renderer'), __RENDERER_PORT__)
    rendererUrl = url
  }

  // 1) Widevine primeiro: o CDM precisa estar registrado ANTES de criar a janela que usa EME.
  const splashTimer = setTimeout(showSplash, 700)
  console.log('[drm] aguardando components.whenReady()…')
  await drm.waitUntilReady(Number(process.env.SONORA_DRM_TIMEOUT_MS) || 45_000)
  clearTimeout(splashTimer)

  // 2) Só então a janela principal.
  mainWindow = createMainWindow()
})

app.on('window-all-closed', () => {
  settings.flush()
  app.quit()
})

app.on('before-quit', () => settings.flush())
