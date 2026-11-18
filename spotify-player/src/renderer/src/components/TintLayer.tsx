import { useEffect, useMemo, useState } from 'react'
import { usePalette, type Palette } from '@/lib/palette'
import { useSettings } from '@/state/settings'
import { hexToRgb, rgba, withLightness, type RGB } from '@/theme/colors'

interface Layer {
  id: number
  colors: [RGB, RGB, RGB]
  visible: boolean
}

let seq = 0

function gradient([a, b, c]: [RGB, RGB, RGB]): string {
  return [
    `radial-gradient(60% 65% at 10% 15%, ${rgba(a, 1)} 0%, ${rgba(a, 0)} 70%)`,
    `radial-gradient(55% 60% at 90% 20%, ${rgba(b, 0.9)} 0%, ${rgba(b, 0)} 70%)`,
    `radial-gradient(75% 60% at 55% 105%, ${rgba(c, 0.95)} 0%, ${rgba(c, 0)} 72%)`
  ].join(',')
}

/**
 * Camada suave tingida com as cores da capa atual, por trás de todos os painéis translúcidos.
 * Troca de faixa = crossfade de opacidade entre duas camadas (só compositor/GPU).
 */
export function TintLayer() {
  const palette = usePalette((s) => s.palette)
  const strength = useSettings((s) => s.settings.tintStrength)
  const accent = useSettings((s) => s.system.accent)
  const [layers, setLayers] = useState<Layer[]>([])

  const colors = useMemo<[RGB, RGB, RGB]>(() => {
    if (palette) return palette.colors
    const base = hexToRgb(accent)
    return [withLightness(base, 0.55), withLightness(base, 0.45, 0.6), withLightness(base, 0.5, 0.8)]
  }, [palette, accent])
  const key = palette?.key ?? `accent:${accent}`

  useEffect(() => {
    const id = ++seq
    setLayers((prev) => [...prev.map((l) => ({ ...l, visible: false })), { id, colors, visible: false }].slice(-3))
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: true } : l))))
    })
    const cleanup = setTimeout(() => setLayers((prev) => prev.filter((l) => l.id === id || l.visible)), 1600)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      clearTimeout(cleanup)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const factor = palette ? strength : strength * 0.55
  return (
    <div className="tint" style={{ ['--tint-final' as string]: `calc(var(--tint-opacity) * ${factor})` }} aria-hidden="true">
      {layers.map((l) => (
        <div key={l.id} className={`tint-layer${l.visible ? ' visible' : ''}`}>
          <div className="blobs" style={{ background: gradient(l.colors) }} />
        </div>
      ))}
      <div className="tint-noise" />
    </div>
  )
}

export type { Palette }
