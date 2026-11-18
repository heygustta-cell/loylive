/**
 * Efeito "Reveal" do Fluent: um brilho suave segue o cursor sobre elementos com a classe `.reveal`.
 *
 * Implementação barata: um único listener delegado no documento, atualizações agrupadas em
 * requestAnimationFrame e apenas duas variáveis CSS por elemento (o brilho é um pseudo-elemento
 * movido com `transform`, então não há layout nem repintura grande).
 */
let raf = 0
let lastEvent: PointerEvent | null = null
let current: HTMLElement | null = null

function update(): void {
  raf = 0
  const e = lastEvent
  if (!e) return
  const target = (e.target as Element | null)?.closest?.('.reveal') as HTMLElement | null
  if (current && current !== target) current.classList.remove('reveal-on')
  current = target
  if (!target) return
  const rect = target.getBoundingClientRect()
  target.style.setProperty('--rx', `${e.clientX - rect.left}px`)
  target.style.setProperty('--ry', `${e.clientY - rect.top}px`)
  target.classList.add('reveal-on')
}

export function installReveal(): () => void {
  const onMove = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse') return
    lastEvent = e
    if (!raf) raf = requestAnimationFrame(update)
  }
  const onLeave = (): void => {
    current?.classList.remove('reveal-on')
    current = null
  }
  document.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerleave', onLeave)
  window.addEventListener('blur', onLeave)
  return () => {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('blur', onLeave)
    if (raf) cancelAnimationFrame(raf)
  }
}
