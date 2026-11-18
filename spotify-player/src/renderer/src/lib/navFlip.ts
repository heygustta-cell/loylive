/**
 * Animação FLIP ao recolher/expandir a navegação: o layout muda uma única vez e a camada de
 * conteúdo desliza até a nova posição usando apenas transform (sem animar largura → sem reflow por quadro).
 */
let pendingLeft: number | null = null

export function beginNavFlip(): void {
  const el = document.querySelector<HTMLElement>('.content')
  pendingLeft = el ? el.getBoundingClientRect().left : null
}

export function finishNavFlip(): void {
  const el = document.querySelector<HTMLElement>('.content')
  if (!el || pendingLeft === null) return
  const dx = pendingLeft - el.getBoundingClientRect().left
  pendingLeft = null
  if (Math.abs(dx) < 1 || document.documentElement.dataset.reduceMotion === 'on') return
  el.animate([{ transform: `translate3d(${dx}px, 0, 0)` }, { transform: 'translate3d(0, 0, 0)' }], {
    duration: 320,
    easing: 'cubic-bezier(0.1, 0.9, 0.2, 1)'
  })
}
