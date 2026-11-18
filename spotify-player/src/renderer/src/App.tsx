import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { AuthState } from '@shared/types'
import { extractPalette, usePalette } from '@/lib/palette'
import { finishNavFlip } from '@/lib/navFlip'
import { goBack, navigate, routeKey, scrollPositions, useNav, type Route } from '@/state/nav'
import { useSettings } from '@/state/settings'
import { useUi } from '@/state/ui'
import { pickImage } from '@/spotify/api'
import { rgba } from '@/theme/colors'
import {
  initPlayer,
  nextTrack,
  previousTrack,
  setVolume,
  togglePlay,
  usePlayer
} from '@/spotify/player'
import { NavPane } from '@/components/NavPane'
import { MiniPlayer } from '@/components/MiniPlayer'
import { NowPlaying } from '@/components/NowPlaying'
import { Notifier } from '@/components/Notifier'
import { PlayerBar } from '@/components/PlayerBar'
import { PlayerErrorBar } from '@/components/PlayerErrorBar'
import { ScrollContext } from '@/components/ScrollContext'
import { searchFieldRef } from '@/components/SearchField'
import { TintLayer } from '@/components/TintLayer'
import { TitleBar } from '@/components/TitleBar'
import { TrackContextMenu } from '@/components/TrackContextMenu'
import { AlbumPage } from '@/pages/AlbumPage'
import { AlbumsPage } from '@/pages/AlbumsPage'
import { ArtistPage } from '@/pages/ArtistPage'
import { HomePage } from '@/pages/HomePage'
import { LikedPage } from '@/pages/LikedPage'
import { LoginPage } from '@/pages/LoginPage'
import { PlaylistPage } from '@/pages/PlaylistPage'
import { PlaylistsPage } from '@/pages/PlaylistsPage'
import { QueuePage } from '@/pages/QueuePage'
import { SearchPage } from '@/pages/SearchPage'
import { SettingsPage } from '@/pages/SettingsPage'

function RouteView({ route, compactNav }: { route: Route; compactNav: boolean }) {
  switch (route.name) {
    case 'home':
      return <HomePage />
    case 'search':
      return <SearchPage q={route.q} compactNav={compactNav} />
    case 'liked':
      return <LikedPage />
    case 'albums':
      return <AlbumsPage />
    case 'playlists':
      return <PlaylistsPage />
    case 'queue':
      return <QueuePage />
    case 'settings':
      return <SettingsPage />
    case 'playlist':
      return <PlaylistPage key={route.id} id={route.id} />
    case 'album':
      return <AlbumPage key={route.id} id={route.id} />
    case 'artist':
      return <ArtistPage key={route.id} id={route.id} />
  }
}

function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = (): void => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

/** Atualiza a paleta (camada tingida + fundo do "Tocando agora") quando a capa muda. */
function usePaletteFollower(): void {
  useEffect(() => {
    let lastUrl: string | null = null
    const run = (images: { url: string; width?: number | null }[] | undefined): void => {
      const url = pickImage(images, 300)
      if (!url || url === lastUrl) return
      lastUrl = url
      void extractPalette(url).then((palette) => {
        if (!palette || lastUrl !== url) return
        usePalette.setState({ palette })
        // Cores da música atual para o dock, o mini player etc. (transições via @property no CSS).
        const root = document.documentElement.style
        root.setProperty('--np-c1', rgba(palette.colors[0], 1))
        root.setProperty('--np-c2', rgba(palette.colors[1], 1))
        root.setProperty('--np-glow', rgba(palette.glow, 1))
      })
    }
    run(usePlayer.getState().track?.album.images)
    return usePlayer.subscribe((s, prev) => {
      if (s.track?.album.uri !== prev.track?.album.uri) run(s.track?.album.images)
    })
  }, [])
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))
}

/** Atalhos de teclado globais. */
function useShortcuts(compactNav: boolean): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const typing = isTyping(e.target)
      if (e.code === 'Space' && !typing && !(e.target as HTMLElement)?.closest?.('button, [role="button"], [role="slider"], [role="tab"], [role="menuitem"], [role="option"]')) {
        e.preventDefault()
        void togglePlay()
      } else if (e.ctrlKey && !e.shiftKey && e.key === 'ArrowRight' && !typing) {
        e.preventDefault()
        void nextTrack()
      } else if (e.ctrlKey && !e.shiftKey && e.key === 'ArrowLeft' && !typing) {
        e.preventDefault()
        void previousTrack()
      } else if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        const v = usePlayer.getState().volume
        setVolume(v + (e.key === 'ArrowUp' ? 0.05 : -0.05))
      } else if (e.ctrlKey && (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'l')) {
        e.preventDefault()
        if (compactNav || !searchFieldRef.current) navigate({ name: 'search', q: '' })
        else searchFieldRef.current.focus()
      } else if ((e.altKey && e.key === 'ArrowLeft') || e.key === 'BrowserBack') {
        e.preventDefault()
        goBack()
      }
    }
    const onMouse = (e: MouseEvent): void => {
      if (e.button === 3) {
        e.preventDefault()
        goBack()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mouseup', onMouse)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mouseup', onMouse)
    }
  }, [compactNav])
}

function Shell() {
  const current = useNav((s) => s.current)
  const transition = useNav((s) => s.transition)
  const navCollapsed = useSettings((s) => s.settings.navCollapsed)
  const narrow = useMediaQuery('(max-width: 1080px)')
  const nowPlayingOpen = useUi((s) => s.nowPlayingOpen)
  const mini = useUi((s) => s.mini)
  const compact = navCollapsed || narrow
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const key = routeKey(current)
  const keyRef = useRef(key)
  keyRef.current = key

  useEffect(() => {
    void initPlayer()
  }, [])
  usePaletteFollower()
  useShortcuts(compact)

  useLayoutEffect(() => finishNavFlip(), [compact])

  // Restaura a rolagem ao voltar; vai ao topo ao entrar numa página nova.
  useLayoutEffect(() => {
    if (!scrollEl) return
    scrollEl.scrollTop = transition === 'back' ? (scrollPositions.get(key) ?? 0) : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, scrollEl])

  if (mini) {
    return (
      <>
        <MiniPlayer />
        <Notifier />
      </>
    )
  }

  return (
    <ScrollContext.Provider value={scrollEl}>
      <div className="app" data-nav={compact ? 'compact' : 'expanded'} aria-hidden={nowPlayingOpen || undefined}>
        <TintLayer />
        <TitleBar />
        <NavPane compact={compact} />
        <main className="content">
          <div
            className="page-scroll"
            ref={setScrollEl}
            onScroll={(e) => scrollPositions.set(keyRef.current, e.currentTarget.scrollTop)}
          >
            <PlayerErrorBar />
            <div key={key} className="page" data-transition={transition}>
              <RouteView route={current} compactNav={compact} />
            </div>
          </div>
          <div id="content-overlay" className="content-overlay" />
        </main>
        <PlayerBar />
      </div>
      <NowPlaying />
      <TrackContextMenu />
      <Notifier />
    </ScrollContext.Provider>
  )
}

export function App() {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const wasLoggedIn = useRef(false)

  useEffect(() => {
    void window.sonora.auth.state().then(setAuth)
    return window.sonora.auth.onChange(setAuth)
  }, [])

  useEffect(() => {
    if (!auth) return
    // Ao sair da conta, recarrega para desconectar o SDK e limpar os caches.
    if (wasLoggedIn.current && !auth.loggedIn) window.location.reload()
    wasLoggedIn.current = auth.loggedIn
  }, [auth])

  if (!auth) return null
  if (!auth.loggedIn)
    return (
      <>
        <LoginPage auth={auth} />
        <Notifier />
      </>
    )
  return <Shell />
}
