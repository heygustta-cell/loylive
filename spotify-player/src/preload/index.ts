import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC } from '@shared/ipc'
import type { SonoraApi, Unsubscribe } from '@shared/api'
import type {
  AppSettings,
  AuthState,
  DrmStatus,
  LoginMode,
  LoginResult,
  OverlayTone,
  SystemThemeInfo
} from '@shared/types'

function on<T>(channel: string, cb: (payload: T) => void): Unsubscribe {
  const listener = (_e: IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

// Valores iniciais síncronos: evitam "piscar" o tema errado na abertura.
const initial = ipcRenderer.sendSync(IPC.systemInitial) as { theme: SystemThemeInfo; settings: AppSettings }

const api: SonoraApi = {
  initial,
  platform: process.platform,

  system: {
    onThemeChange: (cb: (t: SystemThemeInfo) => void) => on(IPC.systemTheme, cb)
  },

  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.settingsGet),
    set: (patch: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke(IPC.settingsSet, patch),
    onChange: (cb: (s: AppSettings) => void) => on(IPC.settingsChanged, cb)
  },

  auth: {
    state: (): Promise<AuthState> => ipcRenderer.invoke(IPC.authState),
    login: (mode: LoginMode): Promise<LoginResult> => ipcRenderer.invoke(IPC.authLogin, mode),
    logout: (): Promise<void> => ipcRenderer.invoke(IPC.authLogout),
    token: (): Promise<{ token?: string; error?: string }> => ipcRenderer.invoke(IPC.authToken),
    onChange: (cb: (s: AuthState) => void) => on(IPC.authChanged, cb)
  },

  drm: {
    status: (): Promise<DrmStatus> => ipcRenderer.invoke(IPC.drmStatus),
    openVmpLab: (): Promise<void> => ipcRenderer.invoke(IPC.drmOpenVmpLab),
    onReady: (cb: (s: DrmStatus) => void) => on(IPC.drmReady, cb)
  },

  window: {
    setOverlayTone: (tone: OverlayTone): void => ipcRenderer.send(IPC.windowOverlayTone, tone),
    toggleFullscreen: (): void => ipcRenderer.send(IPC.windowToggleFullscreen),
    onFullscreen: (cb: (v: boolean) => void) => on(IPC.windowFullscreen, cb),
    onMaximized: (cb: (v: boolean) => void) => on(IPC.windowMaximized, cb)
  },

  openExternal: (url: string): Promise<void> => ipcRenderer.invoke(IPC.openExternal, url)
}

contextBridge.exposeInMainWorld('sonora', api)
