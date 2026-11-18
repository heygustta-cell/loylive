export function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

export function formatLongDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export const plural = (n: number, one: string, many: string): string =>
  `${n.toLocaleString('pt-BR')} ${n === 1 ? one : many}`

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Boa noite'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export const year = (date?: string): string => (date ? date.slice(0, 4) : '')

const ALBUM_TYPES: Record<string, string> = { album: 'Álbum', single: 'Single', compilation: 'Coletânea' }
export const albumType = (t?: string): string => (t ? (ALBUM_TYPES[t] ?? 'Álbum') : 'Álbum')

/** Remove tags HTML simples que às vezes aparecem nas descrições de playlists. */
export function stripHtml(s: string | null | undefined): string {
  if (!s) return ''
  const doc = new DOMParser().parseFromString(s, 'text/html')
  return doc.body.textContent ?? ''
}
