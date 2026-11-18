import { app } from 'electron'
import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types'

/** Armazena as configurações em %APPDATA%/Sonora/settings.json. */
class SettingsStore extends EventEmitter {
  private data: AppSettings = { ...DEFAULT_SETTINGS }
  private file = ''
  private saveTimer: NodeJS.Timeout | null = null

  load(): void {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.file = join(dir, 'settings.json')
    try {
      if (existsSync(this.file)) {
        const parsed = JSON.parse(readFileSync(this.file, 'utf-8')) as Partial<AppSettings>
        this.data = sanitize({ ...DEFAULT_SETTINGS, ...parsed })
      }
    } catch (err) {
      console.warn('[settings] arquivo inválido, usando padrões:', err)
    }
  }

  get(): AppSettings {
    return { ...this.data }
  }

  set(patch: Partial<AppSettings>): AppSettings {
    const before = this.data
    this.data = sanitize({ ...this.data, ...patch })
    this.scheduleSave()
    this.emit('change', this.get(), before)
    return this.get()
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.flush(), 250)
  }

  flush(): void {
    if (!this.file) return
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    try {
      const tmp = `${this.file}.tmp`
      writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf-8')
      renameSync(tmp, this.file)
    } catch (err) {
      console.error('[settings] falha ao salvar:', err)
    }
  }
}

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : fallback
  return Math.min(max, Math.max(min, v))
}

function sanitize(s: AppSettings): AppSettings {
  return {
    clientId: typeof s.clientId === 'string' ? s.clientId.trim() : '',
    theme: ['system', 'light', 'dark'].includes(s.theme) ? s.theme : 'system',
    material: ['mica', 'tabbed', 'acrylic', 'none'].includes(s.material) ? s.material : 'mica',
    tintStrength: clamp(s.tintStrength, 0, 1, DEFAULT_SETTINGS.tintStrength),
    autoTransfer: Boolean(s.autoTransfer),
    volume: clamp(s.volume, 0, 1, DEFAULT_SETTINGS.volume),
    navCollapsed: Boolean(s.navCollapsed),
    reduceMotion: Boolean(s.reduceMotion),
    mediaSession: s.mediaSession !== false
  }
}

export const settings = new SettingsStore()
