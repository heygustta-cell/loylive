/** Tipos compartilhados entre o processo principal, o preload e o renderer. */

export type ThemeMode = 'system' | 'light' | 'dark'
export type WindowMaterial = 'mica' | 'tabbed' | 'acrylic' | 'none'

export interface AppSettings {
  /** Client ID do app no Spotify Developer Dashboard (se vazio, usa MAIN_VITE_SPOTIFY_CLIENT_ID do .env). */
  clientId: string
  theme: ThemeMode
  material: WindowMaterial
  /** Intensidade da camada tingida com as cores da capa (0 a 1). */
  tintStrength: number
  /** Transfere a reprodução para o Sonora automaticamente ao abrir. */
  autoTransfer: boolean
  /** Volume do player (0 a 1). */
  volume: number
  navCollapsed: boolean
  reduceMotion: boolean
  /** Integra com os controles de mídia do Windows (teclas de mídia e painel de volume). */
  mediaSession: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  clientId: '',
  theme: 'system',
  material: 'mica',
  tintStrength: 0.7,
  autoTransfer: true,
  volume: 0.6,
  navCollapsed: false,
  reduceMotion: false,
  mediaSession: true
}

export interface SystemThemeInfo {
  /** Tema efetivo (considera a escolha do usuário e o tema do Windows). */
  dark: boolean
  /** Cor de destaque do Windows em #RRGGBB. */
  accent: string
  highContrast: boolean
  /** true se o Windows suporta Mica/Acrylic (Windows 11 22H2+). */
  materialSupported: boolean
  platform: string
}

export interface AuthState {
  loggedIn: boolean
  /** Há um Client ID configurado (settings ou .env). */
  hasClientId: boolean
  /** Origem do Client ID. */
  clientIdSource: 'settings' | 'env' | 'none'
  redirectUri: string
  scopes: string[]
}

export type LoginMode = 'window' | 'browser'

export interface LoginResult {
  ok: boolean
  error?: string
}

export interface DrmStatus {
  /** true quando components.whenReady() concluiu com sucesso. */
  ready: boolean
  /** Mensagem de erro (timeout, falha de download...). */
  error: string | null
  components: Record<string, { status: string; title: string | null; version: string | null }>
  electron: string
  chrome: string
  /** O app está empacotado (instalado) ou rodando em desenvolvimento. */
  packaged: boolean
}

export type OverlayTone = 'auto' | 'light' | 'dark'
