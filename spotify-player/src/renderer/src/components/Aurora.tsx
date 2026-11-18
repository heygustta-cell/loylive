import { useMemo } from 'react'
import { useSettings } from '@/state/settings'
import { hexToRgb, rgbToOklch, oklchToRgb, rgba } from '@/theme/colors'

/** Fundo "aurora": manchas de cor derivadas da cor de destaque do Windows, em movimento lento (GPU). */
export function Aurora() {
  const accent = useSettings((s) => s.system.accent)
  const dark = useSettings((s) => s.system.dark)
  const colors = useMemo(() => {
    const [, C, H] = rgbToOklch(hexToRgb(accent))
    const c = Math.max(0.12, C)
    const L = dark ? 0.55 : 0.78
    return [0, 0.9, -0.8, 2.2].map((dh, i) => rgba(oklchToRgb(L - i * 0.02, c, H + dh), dark ? 0.75 : 0.65))
  }, [accent, dark])
  return (
    <div className="aurora" aria-hidden="true">
      <div className="mesh">
        {colors.map((c, i) => (
          <span key={i} className={`blob blob-${i}`} style={{ background: `radial-gradient(closest-side, ${c}, transparent)` }} />
        ))}
      </div>
      <div className="aurora-noise" />
    </div>
  )
}
