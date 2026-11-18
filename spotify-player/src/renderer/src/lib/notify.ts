/** Pequeno barramento de notificações (toasts) acessível fora do React. */
export type NotifyIntent = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: number
  title: string
  body?: string
  intent: NotifyIntent
  timeout?: number
}

type Listener = (n: Notification) => void
const listeners = new Set<Listener>()
let seq = 0

export function notify(title: string, opts: { body?: string; intent?: NotifyIntent; timeout?: number } = {}): void {
  const n: Notification = { id: ++seq, title, body: opts.body, intent: opts.intent ?? 'info', timeout: opts.timeout }
  listeners.forEach((l) => l(n))
}

export function onNotify(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}
