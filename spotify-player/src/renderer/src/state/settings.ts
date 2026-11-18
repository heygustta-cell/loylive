import { create } from 'zustand'
import type { AppSettings, SystemThemeInfo } from '@shared/types'

interface SettingsState {
  settings: AppSettings
  system: SystemThemeInfo
  update(patch: Partial<AppSettings>): void
}

export const useSettings = create<SettingsState>((set) => ({
  settings: window.sonora.initial.settings,
  system: window.sonora.initial.theme,
  update(patch) {
    // Atualização otimista; o processo principal persiste e confirma via onChange.
    set((s) => ({ settings: { ...s.settings, ...patch } }))
    void window.sonora.settings.set(patch)
  }
}))

window.sonora.settings.onChange((settings) => useSettings.setState({ settings }))
window.sonora.system.onThemeChange((system) => useSettings.setState({ system }))

/** Retorna true se as animações devem ser reduzidas (preferência do app ou do Windows). */
export function prefersReducedMotion(): boolean {
  return (
    useSettings.getState().settings.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
