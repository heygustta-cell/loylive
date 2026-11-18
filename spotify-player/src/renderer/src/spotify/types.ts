/** Tipos mínimos da Spotify Web API usados pelo app (já normalizados). */

export interface SpotifyImage {
  url: string
  width?: number | null
  height?: number | null
}

export interface ArtistRef {
  id: string | null
  name: string
  uri: string
}

export interface Artist extends ArtistRef {
  images?: SpotifyImage[]
  genres?: string[]
}

export interface AlbumRef {
  id: string | null
  name: string
  uri: string
  images: SpotifyImage[]
  artists: ArtistRef[]
  release_date?: string
  album_type?: string
  total_tracks?: number
}

export interface Album extends AlbumRef {
  label?: string
  copyrights?: { text: string; type: string }[]
}

export interface Track {
  id: string | null
  uri: string
  name: string
  duration_ms: number
  explicit: boolean
  artists: ArtistRef[]
  album: AlbumRef | null
  is_local?: boolean
  is_playable?: boolean
  type: 'track' | 'episode'
  track_number?: number
  disc_number?: number
}

export interface Owner {
  id: string
  display_name: string | null
}

export interface Playlist {
  id: string
  name: string
  uri: string
  description: string | null
  images: SpotifyImage[]
  owner: Owner
  total: number
  collaborative?: boolean
  public?: boolean | null
}

export interface Paging<T> {
  items: T[]
  total: number
  offset: number
  limit: number
  next: string | null
}

export interface User {
  id: string
  display_name: string | null
  images?: SpotifyImage[]
  uri: string
}

export interface SearchResults {
  tracks: Track[]
  albums: AlbumRef[]
  artists: Artist[]
  playlists: Playlist[]
}

export interface QueueData {
  currently_playing: Track | null
  queue: Track[]
}

export interface RecentlyPlayedItem {
  track: Track
  played_at: string
}
