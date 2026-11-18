import { BrowserWindow, nativeTheme, systemPreferences } from 'electron'
import { release } from 'node:os'
import type { AppSettings, OverlayTone, SystemThemeInfo, WindowMaterial } from '@shared/types'

/** Mica/Acrylic via DWM exigem Windows 11 22H2 (build 22621) ou superior. */
export function materialSupported(): boolean {
  if (process.platform !== 'win32') return false
  const build = Number(release().split('.')[2] ?? 0)
  return build >= 22621
}

export function accentColor(): string {
  try {
    const raw = systemPreferences.getAccentColor?.() // RRGGBBAA
    if (raw && /^[0-9a-f]{6,8}$/i.test(raw)) return `#${raw.slice(0, 6).toLowerCase()}`
  } catch {
    /* plataforma sem cor de destaque */
  }
  return '#0067c0' // azul padrão do Windows 11
}

export function systemTheme(): SystemThemeInfo {
  return {
    dark: nativeTheme.shouldUseDarkColors,
    accent: accentColor(),
    highContrast: nativeTheme.shouldUseHighContrastColors,
    materialSupported: materialSupported(),
    platform: process.platform
  }
}

export function applyThemeSource(theme: AppSettings['theme']): void {
  nativeTheme.themeSource = theme
}

/** Cor dos botões nativos (minimizar/maximizar/fechar) da titleBarOverlay. */
export function overlaySymbolColor(tone: OverlayTone): string {
  const dark = tone === 'auto' ? nativeTheme.shouldUseDarkColors : tone === 'dark'
  return dark ? '#ffffff' : '#1a1a1a'
}

export const TITLEBAR_HEIGHT = 48

export function titleBarOverlay(tone: OverlayTone): Electron.TitleBarOverlay {
  return {
    color: '#00000000', // transparente: o Mica aparece por trás dos botões
    symbolColor: overlaySymbolColor(tone),
    height: TITLEBAR_HEIGHT
  }
}

export function applyMaterial(win: BrowserWindow, material: WindowMaterial): void {
  if (!materialSupported()) return
  try {
    win.setBackgroundMaterial(material)
  } catch (err) {
    console.warn('[theme] setBackgroundMaterial falhou:', err)
  }
}
