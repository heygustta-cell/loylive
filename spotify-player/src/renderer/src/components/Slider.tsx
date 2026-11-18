import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRafLoop } from '@/lib/raf'

interface Props {
  max: number
  /** Valor estático (ex.: volume). */
  value?: number
  /** Fonte de valor lida a cada quadro (ex.: posição da música). */
  source?: () => number
  /** Liga o loop de animação (ex.: enquanto toca). */
  live?: boolean
  onChange?: (v: number) => void
  onCommit?: (v: number) => void
  format?: (v: number) => string
  /** "media": trilha fina que engrossa no hover, bolinha só no hover e prévia do tempo sob o cursor. */
  variant?: 'default' | 'media'
  step?: number
  disabled?: boolean
  label: string
  className?: string
}

/**
 * Slider no estilo do Windows 11. A posição é aplicada direto no DOM via transform
 * (scaleX na trilha, translateX no "thumb"), sem re-render do React — fluido em 144 Hz.
 */
export function Slider({
  max,
  value,
  source,
  live = false,
  onChange,
  onCommit,
  format,
  variant = 'default',
  step,
  disabled,
  label,
  className
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(0)
  const dragRef = useRef<number | null>(null)
  const lastFrac = useRef(-1)
  const [dragging, setDragging] = useState(false)
  const latest = useRef({ value, source })
  latest.current = { value, source }

  const setTip = useCallback(
    (v: number, x: number) => {
      const tip = tipRef.current
      if (!tip) return
      tip.style.transform = `translate3d(calc(${x}px - 50%), 0, 0)`
      tip.textContent = format ? format(v) : String(Math.round(v))
    },
    [format]
  )

  const paint = useCallback(
    (v: number, force = false) => {
      const frac = max > 0 ? Math.min(1, Math.max(0, v / max)) : 0
      if (!force && Math.abs(frac - lastFrac.current) < 0.0002) return
      lastFrac.current = frac
      const w = widthRef.current
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${frac})`
      if (thumbRef.current) thumbRef.current.style.transform = `translate3d(${frac * w}px,0,0)`
      if (dragRef.current !== null) setTip(v, frac * w)
      rootRef.current?.setAttribute('aria-valuenow', String(Math.round(v)))
    },
    [max, setTip]
  )

  // Mede a largura uma vez e quando o tamanho muda (evita layout a cada quadro).
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      widthRef.current = entry.contentRect.width
      const { value: v, source: src } = latest.current
      paint(dragRef.current ?? (src ? src() : (v ?? 0)), true)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [paint])

  useEffect(() => {
    if (dragRef.current === null && value !== undefined) paint(value, true)
  }, [value, paint])

  useRafLoop(Boolean(live && source && !dragging), () => {
    if (dragRef.current === null && source) paint(source())
  })

  // Quando a fonte muda sem estar "ao vivo" (pausado/seek), pinta uma vez.
  useEffect(() => {
    if (!live && source && dragRef.current === null) paint(source(), true)
  })

  const fracFromX = (clientX: number): number => {
    const rect = rootRef.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }

  const onPointerDown = (e: React.PointerEvent): void => {
    if (disabled || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const v = fracFromX(e.clientX) * max
    dragRef.current = v
    setDragging(true)
    paint(v, true)
    onChange?.(v)
  }
  const onPointerMove = (e: React.PointerEvent): void => {
    const frac = fracFromX(e.clientX)
    if (dragRef.current === null) {
      // Prévia do tempo sob o cursor (variante de mídia).
      if (variant === 'media' && !disabled) {
        setTip(frac * max, frac * widthRef.current)
        if (hoverRef.current) hoverRef.current.style.transform = `scaleX(${frac})`
      }
      return
    }
    const v = frac * max
    dragRef.current = v
    paint(v)
    onChange?.(v)
  }
  const finish = (e: React.PointerEvent): void => {
    if (dragRef.current === null) return
    const v = dragRef.current
    dragRef.current = null
    setDragging(false)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    onCommit?.(v)
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (disabled) return
    const s = step ?? max / 20
    const cur = source ? source() : (value ?? 0)
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = cur + s
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = cur - s
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = max
    if (next === null) return
    e.preventDefault()
    e.stopPropagation()
    next = Math.min(max, Math.max(0, next))
    paint(next, true)
    onChange?.(next)
    onCommit?.(next)
  }

  return (
    <div
      ref={rootRef}
      className={`slider${variant === 'media' ? ' media' : ''}${className ? ` ${className}` : ''}`}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      data-dragging={dragging ? 'true' : 'false'}
      data-disabled={disabled ? 'true' : 'false'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onKeyDown={onKeyDown}
    >
      <div className="slider-track">
        {variant === 'media' && <div ref={hoverRef} className="slider-hover" />}
        <div ref={fillRef} className="slider-fill" />
      </div>
      <div ref={thumbRef} className="slider-thumb" />
      <div ref={tipRef} className="slider-tip" />
    </div>
  )
}
