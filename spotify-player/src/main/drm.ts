import { app, components } from 'electron'
import { EventEmitter } from 'node:events'
import type { DrmStatus } from '@shared/types'

/**
 * Gerencia o Widevine CDM fornecido pelo Electron da castLabs.
 *
 * O CDM é baixado/atualizado pelo "component updater" na primeira execução. A janela que usa EME
 * (o Web Playback SDK) só deve ser criada DEPOIS de components.whenReady() concluir; caso contrário
 * o navegador não enxerga o com.widevine.alpha.
 */
class DrmManager extends EventEmitter {
  ready = false
  error: string | null = null
  private pending: Promise<void> | null = null

  /**
   * Aguarda o Widevine ficar pronto. Sem rede, o updater pode demorar muito; por isso há um
   * timeout — a janela abre mesmo assim e é recarregada automaticamente quando o CDM ficar pronto.
   */
  waitUntilReady(timeoutMs = 45_000): Promise<void> {
    if (!this.pending) {
      this.pending = components
        .whenReady()
        .then(() => {
          this.ready = true
          this.error = null
          console.log('[drm] componentes prontos:', JSON.stringify(components.status()))
          this.emit('ready')
        })
        .catch((err: Electron.ComponentsError) => {
          const detail = err.errors?.map((e) => `${e.detail?.id ?? '?'}: ${e.message}`).join('; ')
          this.error = `Falha ao instalar o Widevine CDM${detail ? ` (${detail})` : ''}: ${err.message}`
          console.error('[drm]', this.error)
          // Atenção: não usar o evento 'error' (sem listener o EventEmitter lança exceção).
          this.emit('failed', this.error)
        })
    }
    let timer: NodeJS.Timeout | null = null
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        if (!this.ready && !this.error) {
          console.warn(`[drm] Widevine ainda não ficou pronto após ${timeoutMs / 1000}s; abrindo a janela mesmo assim.`)
        }
        resolve()
      }, timeoutMs)
    })
    return Promise.race([this.pending.catch(() => undefined), timeout]).finally(() => {
      if (timer) clearTimeout(timer)
    })
  }

  status(): DrmStatus {
    let list: DrmStatus['components'] = {}
    try {
      list = components.status()
    } catch {
      /* antes do ready */
    }
    return {
      ready: this.ready,
      error: this.error ?? (this.ready ? null : 'O Widevine ainda está sendo preparado…'),
      components: list,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      packaged: app.isPackaged
    }
  }
}

export const drm = new DrmManager()
