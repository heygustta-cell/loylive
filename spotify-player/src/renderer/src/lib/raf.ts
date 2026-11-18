import { useEffect, useRef } from 'react'

/**
 * Executa `cb` a cada quadro (requestAnimationFrame) enquanto `active` for true e a janela estiver
 * visível. Ideal para atualizar o DOM diretamente (transform/textContent) sem re-renderizar o React —
 * acompanha a taxa de atualização do monitor (144 Hz) sem custo extra.
 */
export function useRafLoop(active: boolean, cb: (now: number) => void): void {
  const cbRef = useRef(cb)
  cbRef.current = cb
  useEffect(() => {
    if (!active) {
      cbRef.current(performance.now())
      return
    }
    let id = 0
    const tick = (now: number): void => {
      cbRef.current(now)
      id = requestAnimationFrame(tick)
    }
    const start = (): void => {
      cancelAnimationFrame(id)
      if (document.visibilityState === 'visible') id = requestAnimationFrame(tick)
    }
    start()
    document.addEventListener('visibilitychange', start)
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener('visibilitychange', start)
    }
  }, [active])
}
