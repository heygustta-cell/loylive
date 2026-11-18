import type {
  AppSettings,
  AuthState,
  DrmStatus,
  LoginMode,
  LoginResult,
  OverlayTone,
  SystemThemeInfo
} from './types'

export type Unsubscribe = () => void

/** API exposta pelo preload em window.sonora (contextBridge). */
export interface SonoraApi {
  initial: { theme: SystemThemeInfo; settings: AppSettings }
  platform: string
  system: {
    onThemeChange(cb: (t: SystemThemeInfo) => void): Unsubscribe
  }
  settings: {
    get(): Promise<AppSettings>
    set(patch: Partial<AppSettings>): Promise<AppSettings>
    onChange(cb: (s: AppSettings) => void): Unsubscribe
  }
  auth: {
    state(): Promise<AuthState>
    login(mode: LoginMode): Promise<LoginResult>
    logout(): Promise<void>
    token(): Promise<{ token?: string; error?: string }>
    onChange(cb: (s: AuthState) => void): Unsubscribe
  }
  drm: {
    status(): Promise<DrmStatus>
    openVmpLab(): Promise<void>
    onReady(cb: (s: DrmStatus) => void): Unsubscribe
  }
  window: {
    setOverlayTone(tone: OverlayTone): void
    toggleFullscreen(): void
    onFullscreen(cb: (v: boolean) => void): Unsubscribe
    onMaximized(cb: (v: boolean) => void): Unsubscribe
  }
  openExternal(url: string): Promise<void>
}
