import { create } from 'zustand'

export type Route =
  | { name: 'home' }
  | { name: 'search'; q: string }
  | { name: 'liked' }
  | { name: 'albums' }
  | { name: 'playlists' }
  | { name: 'queue' }
  | { name: 'settings' }
  | { name: 'playlist'; id: string }
  | { name: 'album'; id: string }
  | { name: 'artist'; id: string }

export type RouteName = Route['name']

export const routeKey = (r: Route): string => ('id' in r ? `${r.name}:${r.id}` : r.name)

interface NavState {
  stack: Route[]
  current: Route
  /** Tipo da transição: "drill" ao entrar num item, "back" ao voltar, "top" ao trocar de seção. */
  transition: 'top' | 'drill' | 'back'
  navigate(route: Route, opts?: { replace?: boolean }): void
  back(): void
}

const TOP_LEVEL: RouteName[] = ['home', 'search', 'liked', 'albums', 'playlists', 'queue', 'settings']

export const useNav = create<NavState>((set, get) => ({
  stack: [],
  current: { name: 'home' },
  transition: 'top',
  navigate(route, opts) {
    const { current, stack } = get()
    if (routeKey(route) === routeKey(current) && route.name !== 'search') return
    if (opts?.replace || (route.name === 'search' && current.name === 'search')) {
      set({ current: route })
      return
    }
    set({
      stack: [...stack, current].slice(-60),
      current: route,
      transition: TOP_LEVEL.includes(route.name) ? 'top' : 'drill'
    })
  },
  back() {
    const { stack } = get()
    if (stack.length === 0) return
    const prev = stack[stack.length - 1]
    set({ stack: stack.slice(0, -1), current: prev, transition: 'back' })
  }
}))

export const navigate = (route: Route, opts?: { replace?: boolean }): void => useNav.getState().navigate(route, opts)
export const goBack = (): void => useNav.getState().back()

/** Navega para o destino de uma URI do Spotify (álbum, artista, playlist). */
export function openUri(uri: string | null | undefined): void {
  if (!uri) return
  const [, type, id] = uri.split(':')
  if (!id) return
  if (type === 'album') navigate({ name: 'album', id })
  else if (type === 'artist') navigate({ name: 'artist', id })
  else if (type === 'playlist') navigate({ name: 'playlist', id })
  else if (type === 'collection' || uri.endsWith(':collection')) navigate({ name: 'liked' })
}

/** Posições de rolagem por rota, para restaurar ao voltar. */
export const scrollPositions = new Map<string, number>()
