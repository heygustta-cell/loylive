/**
 * Cliente da Spotify Web API.
 *
 * Observação sobre fev/2026: apps em "Development Mode" passaram a usar endpoints/campos novos
 * (ex.: /playlists/{id}/items, campo "item" no lugar de "track", biblioteca unificada em /me/library).
 * Para funcionar tanto com apps novos quanto antigos, as chamadas afetadas tentam o formato novo e,
 * se o Spotify responder 400/403/404/405/410, recaem no formato antigo — e lembram qual funcionou.
 */
import type {
  Album,
  AlbumRef,
  Artist,
  ArtistRef,
  Paging,
  Playlist,
  QueueData,
  RecentlyPlayedItem,
  SearchResults,
  SpotifyImage,
  Track,
  User
} from './types'

const BASE = 'https://api.spotify.com/v1'

export class SpotifyError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly reason?: string
  ) {
    super(message)
    this.name = 'SpotifyError'
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

async function token(): Promise<string> {
  const r = await window.sonora.auth.token()
  if (!r.token) throw new SpotifyError(r.error ?? 'Não autenticado', 401)
  return r.token
}

type Query = Record<string, string | number | boolean | undefined | null>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Query
  body?: unknown
}

export async function request<T>(path: string, opts: RequestOptions = {}, attempt = 0): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${BASE}${path}`)
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${await token()}` }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    })
  } catch {
    if (attempt < 2) {
      await sleep(600 * (attempt + 1))
      return request<T>(path, opts, attempt + 1)
    }
    throw new SpotifyError('Sem conexão com a internet.', 0)
  }

  // Limite de requisições: respeita o Retry-After.
  if (res.status === 429 && attempt < 3) {
    const wait = Math.min(15, Number(res.headers.get('Retry-After') ?? '1') || 1)
    await sleep(wait * 1000)
    return request<T>(path, opts, attempt + 1)
  }
  if (res.status >= 500 && attempt < 2 && (opts.method ?? 'GET') === 'GET') {
    await sleep(500 * (attempt + 1))
    return request<T>(path, opts, attempt + 1)
  }

  const text = await res.text()
  let data: unknown = undefined
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    const err = (data as { error?: { message?: string; reason?: string } } | undefined)?.error
    throw new SpotifyError(err?.message || res.statusText || `HTTP ${res.status}`, res.status, err?.reason)
  }
  return data as T
}

const FALLBACK_STATUS = new Set([400, 403, 404, 405, 410])

/** Tenta cada variante em ordem; memoriza a que funcionou para a "chave" informada. */
const workingVariant = new Map<string, number>()
async function compat<T>(key: string, variants: Array<() => Promise<T>>): Promise<T> {
  const start = workingVariant.get(key) ?? 0
  let lastErr: unknown
  for (let i = start; i < variants.length; i++) {
    try {
      const out = await variants[i]()
      workingVariant.set(key, i)
      return out
    } catch (err) {
      lastErr = err
      if (!(err instanceof SpotifyError) || !FALLBACK_STATUS.has(err.status)) throw err
    }
  }
  throw lastErr
}

/** Alguns limites máximos foram reduzidos em 2026; se o Spotify recusar o limite, tenta um menor. */
const workingLimit = new Map<string, number>()
async function withLimit<T>(key: string, limits: number[], fn: (limit: number) => Promise<T>): Promise<T> {
  const known = workingLimit.get(key)
  const list = known ? limits.filter((l) => l <= known) : limits
  let lastErr: unknown
  for (const limit of list) {
    try {
      const out = await fn(limit)
      workingLimit.set(key, limit)
      return out
    } catch (err) {
      lastErr = err
      if (!(err instanceof SpotifyError) || err.status !== 400) throw err
    }
  }
  throw lastErr
}

// ─── Normalização ──────────────────────────────────────────────────────────────────────────
type Raw = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

function images(v: unknown): SpotifyImage[] {
  return Array.isArray(v) ? (v as SpotifyImage[]).filter((i) => i && i.url) : []
}

function artistRef(a: Raw): ArtistRef {
  return { id: a?.id ?? null, name: a?.name ?? 'Artista desconhecido', uri: a?.uri ?? '' }
}

export function normAlbum(a: Raw | null | undefined): AlbumRef | null {
  if (!a) return null
  return {
    id: a.id ?? null,
    name: a.name ?? '',
    uri: a.uri ?? '',
    images: images(a.images),
    artists: Array.isArray(a.artists) ? a.artists.map(artistRef) : [],
    release_date: a.release_date,
    album_type: a.album_type,
    total_tracks: a.total_tracks
  }
}

export function normTrack(t: Raw | null | undefined, album?: AlbumRef | null): Track | null {
  if (!t || !t.uri) return null
  if (t.type === 'episode') {
    return {
      id: t.id ?? null,
      uri: t.uri,
      name: t.name ?? '',
      duration_ms: t.duration_ms ?? 0,
      explicit: Boolean(t.explicit),
      artists: [{ id: t.show?.id ?? null, name: t.show?.name ?? 'Podcast', uri: t.show?.uri ?? '' }],
      album: { id: t.show?.id ?? null, name: t.show?.name ?? '', uri: t.show?.uri ?? '', images: images(t.images ?? t.show?.images), artists: [] },
      type: 'episode',
      is_playable: t.is_playable
    }
  }
  return {
    id: t.id ?? null,
    uri: t.uri,
    name: t.name ?? '',
    duration_ms: t.duration_ms ?? 0,
    explicit: Boolean(t.explicit),
    artists: Array.isArray(t.artists) ? t.artists.map(artistRef) : [],
    album: normAlbum(t.album) ?? album ?? null,
    is_local: t.is_local,
    is_playable: t.is_playable,
    type: 'track',
    track_number: t.track_number,
    disc_number: t.disc_number
  }
}

export function normPlaylist(p: Raw | null | undefined): Playlist | null {
  if (!p || !p.id) return null
  // Fev/2026: "tracks" virou "items" (ambos com .total).
  const total = p.items?.total ?? p.tracks?.total ?? 0
  return {
    id: p.id,
    name: p.name ?? '',
    uri: p.uri ?? `spotify:playlist:${p.id}`,
    description: p.description ?? null,
    images: images(p.images),
    owner: { id: p.owner?.id ?? '', display_name: p.owner?.display_name ?? null },
    total,
    collaborative: p.collaborative,
    public: p.public
  }
}

function normArtist(a: Raw | null | undefined): Artist | null {
  if (!a || !a.id) return null
  return { ...artistRef(a), images: images(a.images), genres: a.genres }
}

function paging<T>(raw: Raw, map: (x: Raw) => T | null): Paging<T> {
  const items = (Array.isArray(raw?.items) ? raw.items : []).map(map).filter(Boolean) as T[]
  return {
    items,
    total: raw?.total ?? items.length,
    offset: raw?.offset ?? 0,
    limit: raw?.limit ?? items.length,
    next: raw?.next ?? null
  }
}

/** Pega o objeto de música de um item de playlist (campo "item" novo ou "track" antigo). */
function playlistEntryTrack(e: Raw): Track | null {
  return normTrack(e?.item ?? e?.track)
}

const idFromUri = (uri: string): string => uri.split(':').pop() ?? uri

// ─── Endpoints ─────────────────────────────────────────────────────────────────────────────
export const spotify = {
  me: (): Promise<User> => request<User>('/me'),

  myPlaylists: (offset = 0) =>
    withLimit('me/playlists', [50, 20, 10], (limit) =>
      request<Raw>('/me/playlists', { query: { offset, limit } })
    ).then((r) => paging(r, normPlaylist)),

  playlist: (id: string) => request<Raw>(`/playlists/${id}`).then((p) => normPlaylist(p)!),

  playlistTracks: (id: string, offset = 0) =>
    compat('playlist-items', [
      () =>
        withLimit('playlist-items', [50, 20, 10], (limit) =>
          request<Raw>(`/playlists/${id}/items`, { query: { offset, limit, additional_types: 'track,episode' } })
        ),
      () =>
        withLimit('playlist-tracks', [50, 20, 10], (limit) =>
          request<Raw>(`/playlists/${id}/tracks`, { query: { offset, limit, additional_types: 'track,episode' } })
        )
    ]).then((r) => paging(r, playlistEntryTrack)),

  savedTracks: (offset = 0) =>
    withLimit('me/tracks', [50, 20, 10], (limit) => request<Raw>('/me/tracks', { query: { offset, limit } })).then(
      (r) => paging(r, (e) => normTrack(e.track ?? e.item))
    ),

  savedAlbums: (offset = 0) =>
    withLimit('me/albums', [50, 20, 10], (limit) => request<Raw>('/me/albums', { query: { offset, limit } })).then(
      (r) => paging(r, (e) => normAlbum(e.album ?? e.item))
    ),

  album: (id: string) =>
    request<Raw>(`/albums/${id}`).then((a) => {
      const album = normAlbum(a)! as Album
      album.label = a.label
      album.copyrights = a.copyrights
      const tracks = paging(a.tracks ?? {}, (t) => normTrack(t, album))
      return { album, tracks }
    }),

  albumTracks: (id: string, album: AlbumRef, offset = 0) =>
    withLimit('album-tracks', [50, 20, 10], (limit) =>
      request<Raw>(`/albums/${id}/tracks`, { query: { offset, limit } })
    ).then((r) => paging(r, (t) => normTrack(t, album))),

  artist: (id: string) => request<Raw>(`/artists/${id}`).then((a) => normArtist(a)!),

  artistAlbums: (id: string, offset = 0) =>
    withLimit('artist-albums', [20, 10], (limit) =>
      request<Raw>(`/artists/${id}/albums`, { query: { offset, limit, include_groups: 'album,single,compilation' } })
    ).then((r) => paging(r, normAlbum)),

  search: async (q: string): Promise<SearchResults> => {
    const r = await withLimit('search', [10, 5], (limit) =>
      request<Raw>('/search', { query: { q, type: 'track,album,artist,playlist', limit } })
    )
    return {
      tracks: paging(r.tracks ?? {}, (t) => normTrack(t)).items,
      albums: paging(r.albums ?? {}, normAlbum).items,
      artists: paging(r.artists ?? {}, normArtist).items,
      playlists: paging(r.playlists ?? {}, normPlaylist).items
    }
  },

  recentlyPlayed: () =>
    withLimit('recently-played', [30, 20, 10], (limit) =>
      request<Raw>('/me/player/recently-played', { query: { limit } })
    ).then((r) =>
      (Array.isArray(r?.items) ? r.items : [])
        .map((i: Raw) => ({ track: normTrack(i.track), played_at: i.played_at }))
        .filter((i: { track: Track | null }) => i.track) as RecentlyPlayedItem[]
    ),

  topArtists: () =>
    withLimit('top-artists', [12, 10], (limit) =>
      request<Raw>('/me/top/artists', { query: { limit, time_range: 'short_term' } })
    ).then((r) => paging(r, normArtist).items),

  topTracks: () =>
    withLimit('top-tracks', [12, 10], (limit) =>
      request<Raw>('/me/top/tracks', { query: { limit, time_range: 'short_term' } })
    ).then((r) => paging(r, (t) => normTrack(t)).items),

  // ─── Player ──────────────────────────────────────────────────────────────────────────────
  playbackState: () => request<Raw | undefined>('/me/player'),

  transfer: (deviceId: string, play: boolean) =>
    request<void>('/me/player', { method: 'PUT', body: { device_ids: [deviceId], play } }),

  play: (
    deviceId: string,
    body: { context_uri?: string; uris?: string[]; offset?: { uri: string } | { position: number }; position_ms?: number }
  ) => request<void>('/me/player/play', { method: 'PUT', query: { device_id: deviceId }, body }),

  shuffle: (state: boolean, deviceId?: string) =>
    request<void>('/me/player/shuffle', { method: 'PUT', query: { state, device_id: deviceId } }),

  repeat: (state: 'off' | 'context' | 'track', deviceId?: string) =>
    request<void>('/me/player/repeat', { method: 'PUT', query: { state, device_id: deviceId } }),

  queue: (): Promise<QueueData> =>
    request<Raw>('/me/player/queue').then((r) => ({
      currently_playing: normTrack(r?.currently_playing),
      queue: (Array.isArray(r?.queue) ? r.queue : []).map((t: Raw) => normTrack(t)).filter(Boolean) as Track[]
    })),

  addToQueue: (uri: string, deviceId?: string) =>
    request<void>('/me/player/queue', { method: 'POST', query: { uri, device_id: deviceId } }),

  // ─── Biblioteca (curtidas) ─────────────────────────────────────────────────────────────────
  isSaved: (uris: string[]): Promise<boolean[]> =>
    compat('library-contains', [
      () => request<boolean[]>('/me/library/contains', { query: { uris: uris.join(',') } }),
      () => request<boolean[]>('/me/tracks/contains', { query: { ids: uris.map(idFromUri).join(',') } })
    ]),

  save: (uris: string[]) =>
    compat('library-save', [
      () => request<void>('/me/library', { method: 'PUT', query: { uris: uris.join(',') } }),
      () => request<void>('/me/tracks', { method: 'PUT', query: { ids: uris.map(idFromUri).join(',') } })
    ]),

  unsave: (uris: string[]) =>
    compat('library-remove', [
      () => request<void>('/me/library', { method: 'DELETE', query: { uris: uris.join(',') } }),
      () => request<void>('/me/tracks', { method: 'DELETE', query: { ids: uris.map(idFromUri).join(',') } })
    ])
}

/** Escolhe a menor imagem com pelo menos `size` px (considerando o devicePixelRatio). */
export function pickImage(list: SpotifyImage[] | undefined | null, size: number): string | null {
  if (!list || list.length === 0) return null
  const target = size * Math.min(2, window.devicePixelRatio || 1)
  const sorted = [...list].sort((a, b) => (a.width ?? 640) - (b.width ?? 640))
  return (sorted.find((i) => (i.width ?? 640) >= target) ?? sorted[sorted.length - 1]).url
}
