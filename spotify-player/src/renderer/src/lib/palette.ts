/**
 * Extrai uma paleta da capa (cores dominantes/vibrantes) e gera um fundo desfocado pré-renderizado.
 * O desfoque é feito UMA vez num canvas minúsculo e depois ampliado pela GPU — muito mais barato
 * do que um `filter: blur()` animado em tela cheia, e por isso fluido em 144 Hz.
 */
import { create } from 'zustand'
import { rgbToOklch, oklchToRgb, type RGB } from '@/theme/colors'

export interface Palette {
  key: string
  /** Três cores para a camada tingida (já ajustadas para ficarem bonitas como fundo). */
  colors: [RGB, RGB, RGB]
  /** Cor mais vibrante, sem ajustes. */
  vibrant: RGB
  /** URL (blob:) de uma versão desfocada da capa, para o fundo do "Tocando agora". */
  backdrop: string | null
}

const cache = new Map<string, Palette>()
const MAX_CACHE = 40

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('imagem indisponível'))
    img.src = url
  })
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2)
  return d > Math.PI ? Math.PI * 2 - d : d
}

interface Bucket {
  r: number
  g: number
  b: number
  n: number
}

function computeColors(img: HTMLImageElement): { colors: [RGB, RGB, RGB]; vibrant: RGB } {
  const size = 40
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, size, size)
  const data = ctx.getImageData(0, 0, size, size).data

  const buckets = new Map<number, Bucket>()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bk = buckets.get(key)
    if (bk) {
      bk.r += r
      bk.g += g
      bk.b += b
      bk.n++
    } else buckets.set(key, { r, g, b, n: 1 })
  }

  const candidates = [...buckets.values()]
    .map((bk) => {
      const rgb: RGB = [bk.r / bk.n, bk.g / bk.n, bk.b / bk.n]
      const [L, C, H] = rgbToOklch(rgb)
      // Favorece cores saturadas e de luminosidade média; penaliza quase-preto/quase-branco.
      const lightness = 1 - Math.min(1, Math.abs(L - 0.6) / 0.45)
      const score = bk.n * (0.15 + C * 6) * (0.25 + lightness)
      return { rgb, L, C, H, n: bk.n, score }
    })
    .sort((a, b) => b.score - a.score)

  if (candidates.length === 0) {
    const gray: RGB = [96, 96, 96]
    return { colors: [gray, gray, gray], vibrant: gray }
  }

  const picked = [candidates[0]]
  for (const c of candidates) {
    if (picked.length >= 3) break
    const distinct = picked.every((p) => hueDistance(p.H, c.H) > 0.6 || Math.abs(p.L - c.L) > 0.22 || Math.abs(p.C - c.C) > 0.08)
    if (distinct && c.n > 2) picked.push(c)
  }
  while (picked.length < 3) picked.push(picked[picked.length - 1])

  // Normaliza para servir de fundo: luminosidade e croma controlados (o tema decide a opacidade).
  const adjust = (c: (typeof picked)[number]): RGB => oklchToRgb(Math.min(0.72, Math.max(0.42, c.L)), Math.max(0.04, Math.min(0.2, c.C * 1.25)), c.H)
  return {
    colors: [adjust(picked[0]), adjust(picked[1]), adjust(picked[2])],
    vibrant: picked[0].rgb
  }
}

async function makeBackdrop(img: HTMLImageElement): Promise<string | null> {
  try {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.filter = 'blur(5px) saturate(1.35)'
    // Desenha maior que o canvas para que as bordas desfocadas não fiquem transparentes.
    ctx.drawImage(img, -10, -10, size + 20, size + 20)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    return blob ? URL.createObjectURL(blob) : null
  } catch {
    return null
  }
}

export async function extractPalette(url: string): Promise<Palette | null> {
  const hit = cache.get(url)
  if (hit) {
    cache.delete(url)
    cache.set(url, hit)
    return hit
  }
  try {
    const img = await loadImage(url)
    const { colors, vibrant } = computeColors(img)
    const backdrop = await makeBackdrop(img)
    const palette: Palette = { key: url, colors, vibrant, backdrop }
    cache.set(url, palette)
    if (cache.size > MAX_CACHE) {
      const oldest = cache.keys().next().value as string
      const old = cache.get(oldest)
      if (old?.backdrop) URL.revokeObjectURL(old.backdrop)
      cache.delete(oldest)
    }
    return palette
  } catch (err) {
    console.warn('[paleta] não foi possível ler a capa:', err)
    return null
  }
}

/** Paleta da faixa atual (atualizada pelo App quando a faixa muda). */
export const usePalette = create<{ palette: Palette | null }>(() => ({ palette: null }))
