import { QueryClient, useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { spotify, SpotifyError } from './api'
import type { AlbumRef, Paging, Track } from './types'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => {
        if (err instanceof SpotifyError && [400, 401, 403, 404].includes(err.status)) return false
        return count < 2
      }
    }
  }
})

const nextOffset = <T,>(last: Paging<T>): number | undefined =>
  last.next && last.offset + last.items.length < last.total ? last.offset + last.items.length : undefined

export function flatPages<T>(data: InfiniteData<Paging<T>> | undefined): T[] {
  return data ? data.pages.flatMap((p) => p.items) : []
}

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: spotify.me, staleTime: Infinity })

export const useMyPlaylists = () =>
  useInfiniteQuery({
    queryKey: ['me', 'playlists'],
    queryFn: ({ pageParam }) => spotify.myPlaylists(pageParam),
    initialPageParam: 0,
    getNextPageParam: nextOffset
  })

/** Carrega todas as páginas automaticamente (usado na lista de playlists da navegação). */
export function useAllMyPlaylists() {
  const q = useMyPlaylists()
  useEffect(() => {
    if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage()
  }, [q.hasNextPage, q.isFetchingNextPage, q.fetchNextPage])
  return { ...q, playlists: useMemo(() => flatPages(q.data), [q.data]) }
}

export const usePlaylist = (id: string) =>
  useQuery({ queryKey: ['playlist', id], queryFn: () => spotify.playlist(id) })

export const usePlaylistTracks = (id: string) =>
  useInfiniteQuery({
    queryKey: ['playlist', id, 'tracks'],
    queryFn: ({ pageParam }) => spotify.playlistTracks(id, pageParam),
    initialPageParam: 0,
    getNextPageParam: nextOffset
  })

export const useSavedTracks = () =>
  useInfiniteQuery({
    queryKey: ['me', 'tracks'],
    queryFn: ({ pageParam }) => spotify.savedTracks(pageParam),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
    staleTime: 60_000
  })

export const useSavedAlbums = () =>
  useInfiniteQuery({
    queryKey: ['me', 'albums'],
    queryFn: ({ pageParam }) => spotify.savedAlbums(pageParam),
    initialPageParam: 0,
    getNextPageParam: nextOffset
  })

export const useAlbum = (id: string) => useQuery({ queryKey: ['album', id], queryFn: () => spotify.album(id) })

export const useAlbumMoreTracks = (id: string, album: AlbumRef | undefined, first: Paging<Track> | undefined) =>
  useInfiniteQuery({
    queryKey: ['album', id, 'tracks'],
    enabled: Boolean(album && first && nextOffset(first) !== undefined),
    queryFn: ({ pageParam }) => spotify.albumTracks(id, album!, pageParam),
    initialPageParam: first ? (nextOffset(first) ?? 0) : 0,
    getNextPageParam: nextOffset
  })

export const useArtist = (id: string) => useQuery({ queryKey: ['artist', id], queryFn: () => spotify.artist(id) })

export const useArtistAlbums = (id: string) =>
  useInfiniteQuery({
    queryKey: ['artist', id, 'albums'],
    queryFn: ({ pageParam }) => spotify.artistAlbums(id, pageParam),
    initialPageParam: 0,
    getNextPageParam: nextOffset
  })

export const useSearch = (q: string) =>
  useQuery({
    queryKey: ['search', q],
    queryFn: () => spotify.search(q),
    enabled: q.trim().length > 0,
    staleTime: 2 * 60_000,
    placeholderData: (prev) => prev
  })

export const useRecentlyPlayed = () =>
  useQuery({ queryKey: ['me', 'recent'], queryFn: spotify.recentlyPlayed, staleTime: 60_000 })
export const useTopArtists = () => useQuery({ queryKey: ['me', 'top-artists'], queryFn: spotify.topArtists })
export const useTopTracks = () => useQuery({ queryKey: ['me', 'top-tracks'], queryFn: spotify.topTracks })

export const useQueue = (trackUri: string | null | undefined) =>
  useQuery({
    queryKey: ['queue', trackUri ?? ''],
    queryFn: spotify.queue,
    staleTime: 15_000,
    placeholderData: (prev) => prev
  })

// ─── Curtidas (cache + carregamento em lote) ─────────────────────────────────────────────────
interface LikedState {
  map: Record<string, boolean>
}
export const useLikedStore = create<LikedState>(() => ({ map: {} }))

let pending = new Set<string>()
let flushTimer: ReturnType<typeof setTimeout> | null = null
const inFlight = new Set<string>()

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(async () => {
    flushTimer = null
    const uris = [...pending]
    pending = new Set()
    for (let i = 0; i < uris.length; i += 40) {
      const batch = uris.slice(i, i + 40)
      batch.forEach((u) => inFlight.add(u))
      try {
        const result = await spotify.isSaved(batch)
        useLikedStore.setState((s) => {
          const patch: Record<string, boolean> = {}
          // Não sobrescreve o que já foi definido enquanto a requisição estava em andamento
          // (ex.: página "Músicas curtidas" ou um clique no coração).
          batch.forEach((u, idx) => {
            if (s.map[u] === undefined) patch[u] = Boolean(result?.[idx])
          })
          return { map: { ...s.map, ...patch } }
        })
      } catch (err) {
        console.warn('[curtidas] falha ao verificar', err)
      } finally {
        batch.forEach((u) => inFlight.delete(u))
      }
    }
  }, 60)
}

/** Informa ao cache que estas músicas são curtidas (ex.: vindas de "Músicas curtidas"). */
export function primeLiked(uris: string[], value = true): void {
  const patch: Record<string, boolean> = {}
  uris.forEach((u) => {
    patch[u] = value
    pending.delete(u)
  })
  useLikedStore.setState((s) => ({ map: { ...s.map, ...patch } }))
}

export function useIsLiked(uri: string | null | undefined): boolean | undefined {
  const value = useLikedStore((s) => (uri ? s.map[uri] : undefined))
  useEffect(() => {
    if (!uri || !uri.startsWith('spotify:track:')) return
    if (useLikedStore.getState().map[uri] !== undefined || inFlight.has(uri)) return
    pending.add(uri)
    scheduleFlush()
  }, [uri])
  return value
}

export async function toggleLiked(uri: string): Promise<boolean> {
  const current = Boolean(useLikedStore.getState().map[uri])
  primeLiked([uri], !current)
  try {
    if (current) await spotify.unsave([uri])
    else await spotify.save([uri])
    void queryClient.invalidateQueries({ queryKey: ['me', 'tracks'] })
    return !current
  } catch (err) {
    primeLiked([uri], current)
    throw err
  }
}
