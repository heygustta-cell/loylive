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
  contextMenu: ContextMenuState | null
  setNowPlaying(open: boolean): void
  openContextMenu(menu: ContextMenuState): void
  closeContextMenu(): void
}

export const useUi = create<UiState>((set) => ({
  nowPlayingOpen: false,
  fullscreen: false,
  contextMenu: null,
  setNowPlaying: (open) => set({ nowPlayingOpen: open }),
  openContextMenu: (menu) => set({ contextMenu: menu }),
  closeContextMenu: () => set({ contextMenu: null })
}))

window.sonora.window.onFullscreen((fullscreen) => useUi.setState({ fullscreen }))
