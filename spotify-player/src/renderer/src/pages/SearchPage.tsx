import { Spinner, Tab, TabList } from '@fluentui/react-components'
import { SearchRegular } from '@fluentui/react-icons'
import { useEffect, useState } from 'react'
import { albumType, year } from '@/lib/format'
import { navigate } from '@/state/nav'
import { playSafe } from '@/spotify/player'
import { useSearch } from '@/spotify/queries'
import type { Track } from '@/spotify/types'
import { Artwork } from '@/components/Artwork'
import { CardGrid, MediaCard, Shelf } from '@/components/MediaCard'
import { SearchField, searchFieldRef } from '@/components/SearchField'
import { TrackList } from '@/components/TrackList'
import { EmptyState, ErrorState } from '@/components/States'

type TabId = 'all' | 'tracks' | 'artists' | 'albums' | 'playlists'

export function SearchPage({ q, compactNav }: { q: string; compactNav: boolean }) {
  const [tab, setTab] = useState<TabId>('all')
  const query = useSearch(q)
  const r = query.data

  useEffect(() => {
    if (!compactNav) searchFieldRef.current?.focus()
  }, [compactNav])

  const playTrack = (tracks: Track[]) => (track: Track) =>
    playSafe(track.album?.uri ? { contextUri: track.album.uri, offsetUri: track.uri } : { uris: [track.uri] }, {
      uris: tracks.map((t) => t.uri),
      offsetUri: track.uri
    })

  const header = (
    <>
      <h1 className="t-title-large page-title">{q ? `Resultados para “${q}”` : 'Buscar'}</h1>
      {compactNav && (
        <div style={{ maxWidth: 520, marginBottom: 20 }}>
          <SearchField autoFocus size="large" />
        </div>
      )}
    </>
  )

  if (!q.trim()) {
    return (
      <>
        {header}
        <EmptyState icon={<SearchRegular />} title="O que você quer ouvir?">
          Busque por músicas, artistas, álbuns e playlists. Atalho: Ctrl+F
        </EmptyState>
      </>
    )
  }

  const top = r?.artists[0] ?? null
  const topTrack = r?.tracks[0] ?? null

  return (
    <>
      {header}
      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as TabId)} style={{ marginBottom: 20 }}>
        <Tab value="all">Tudo</Tab>
        <Tab value="tracks">Músicas</Tab>
        <Tab value="artists">Artistas</Tab>
        <Tab value="albums">Álbuns</Tab>
        <Tab value="playlists">Playlists</Tab>
      </TabList>

      {query.error && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.isLoading && (
        <div className="spinner-center">
          <Spinner />
        </div>
      )}

      {r && (
        <div key={`${q}-${tab}`} className="enter">
          {tab === 'all' && (
            <>
              {(top || topTrack) && (
                <div className="search-top section">
                  <div>
                    <h2 className="t-subtitle" style={{ margin: '0 0 12px' }}>
                      Melhor resultado
                    </h2>
                    {top ? (
                      <button className="top-result reveal" onClick={() => top.id && navigate({ name: 'artist', id: top.id })}>
                        <Artwork images={top.images} size={104} round />
                        <span className="t-title ellipsis">{top.name}</span>
                        <span className="text-2">Artista</span>
                      </button>
                    ) : topTrack ? (
                      <button className="top-result reveal" onClick={() => playTrack(r.tracks)(topTrack)}>
                        <Artwork images={topTrack.album?.images} size={104} />
                        <span className="t-title ellipsis">{topTrack.name}</span>
                        <span className="text-2">{topTrack.artists.map((a) => a.name).join(', ')}</span>
                      </button>
                    ) : null}
                  </div>
                  <div>
                    <h2 className="t-subtitle" style={{ margin: '0 0 12px' }}>
                      Músicas
                    </h2>
                    <TrackList tracks={r.tracks.slice(0, 5)} onPlay={playTrack(r.tracks)} showAlbum={false} />
                  </div>
                </div>
              )}
              {r.artists.length > 0 && (
                <Shelf title="Artistas">
                  {r.artists.map((a, i) => (
                    <MediaCard key={a.uri} index={i} round title={a.name} subtitle="Artista" images={a.images}
                      onOpen={() => a.id && navigate({ name: 'artist', id: a.id })} onPlay={() => playSafe({ contextUri: a.uri })} />
                  ))}
                </Shelf>
              )}
              {r.albums.length > 0 && (
                <Shelf title="Álbuns">
                  {r.albums.map((a, i) => (
                    <MediaCard key={a.uri} index={i} title={a.name}
                      subtitle={[a.artists.map((x) => x.name).join(', '), year(a.release_date)].filter(Boolean).join(' • ')}
                      images={a.images} onOpen={() => a.id && navigate({ name: 'album', id: a.id })}
                      onPlay={() => playSafe({ contextUri: a.uri })} />
                  ))}
                </Shelf>
              )}
              {r.playlists.length > 0 && (
                <Shelf title="Playlists">
                  {r.playlists.map((p, i) => (
                    <MediaCard key={p.id} index={i} title={p.name} subtitle={p.owner.display_name ?? undefined} images={p.images}
                      onOpen={() => navigate({ name: 'playlist', id: p.id })} onPlay={() => playSafe({ contextUri: p.uri })} />
                  ))}
                </Shelf>
              )}
              {!r.tracks.length && !r.artists.length && !r.albums.length && !r.playlists.length && (
                <EmptyState icon={<SearchRegular />} title="Nada encontrado">
                  Verifique a ortografia ou tente outras palavras.
                </EmptyState>
              )}
            </>
          )}
          {tab === 'tracks' && <TrackList tracks={r.tracks} onPlay={playTrack(r.tracks)} />}
          {tab === 'artists' && (
            <CardGrid>
              {r.artists.map((a, i) => (
                <MediaCard key={a.uri} index={i} round title={a.name} subtitle="Artista" images={a.images}
                  onOpen={() => a.id && navigate({ name: 'artist', id: a.id })} onPlay={() => playSafe({ contextUri: a.uri })} />
              ))}
            </CardGrid>
          )}
          {tab === 'albums' && (
            <CardGrid>
              {r.albums.map((a, i) => (
                <MediaCard key={a.uri} index={i} title={a.name}
                  subtitle={[albumType(a.album_type), a.artists.map((x) => x.name).join(', ')].join(' • ')}
                  images={a.images} onOpen={() => a.id && navigate({ name: 'album', id: a.id })}
                  onPlay={() => playSafe({ contextUri: a.uri })} />
              ))}
            </CardGrid>
          )}
          {tab === 'playlists' && (
            <CardGrid>
              {r.playlists.map((p, i) => (
                <MediaCard key={p.id} index={i} title={p.name} subtitle={p.owner.display_name ?? undefined} images={p.images}
                  onOpen={() => navigate({ name: 'playlist', id: p.id })} onPlay={() => playSafe({ contextUri: p.uri })} />
              ))}
            </CardGrid>
          )}
        </div>
      )}
    </>
  )
}
