import { create } from 'zustand'
import type { Track } from '@/spotify/types'

export interface ContextMenuState {
  track: Track
  x: number
  y: number
  /** Contexto em que a faixa aparece (para "tocar a partir daqui"). */
  contextUri?: string
}

interface UiState {
  nowPlayingOpen: boolean
  fullscreen: boolean
  /** Mini player (janela pequena sempre visível). */
  mini: boolean
  contextMenu: ContextMenuState | null
  setNowPlaying(open: boolean): void
  setMini(on: boolean): void
  openContextMenu(menu: ContextMenuState): void
  closeContextMenu(): void
}

export const useUi = create<UiState>((set) => ({
  nowPlayingOpen: false,
  fullscreen: false,
  mini: false,
  contextMenu: null,
  setNowPlaying: (open) => set({ nowPlayingOpen: open }),
  setMini: (on) => {
    set({ nowPlayingOpen: false, contextMenu: null })
    window.sonora.window.setMini(on)
  },
  openContextMenu: (menu) => set({ contextMenu: menu }),
  closeContextMenu: () => set({ contextMenu: null })
}))

window.sonora.window.onFullscreen((fullscreen) => useUi.setState({ fullscreen }))
window.sonora.window.onMini((mini) => useUi.setState({ mini }))
