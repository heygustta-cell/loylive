import { Button } from '@fluentui/react-components'
import { useMemo } from 'react'
import { greeting } from '@/lib/format'
import { navigate } from '@/state/nav'
import { playSafe } from '@/spotify/player'
import { flatPages, useMe, useMyPlaylists, useRecentlyPlayed, useTopArtists, useTopTracks } from '@/spotify/queries'
import type { AlbumRef, Track } from '@/spotify/types'
import { CardGrid, CardSkeletons, MediaCard, Shelf } from '@/components/MediaCard'
import { TrackList } from '@/components/TrackList'
import { ErrorState } from '@/components/States'

export function HomePage() {
  const { data: me } = useMe()
  const recent = useRecentlyPlayed()
  const playlists = useMyPlaylists()
  const topArtists = useTopArtists()
  const topTracks = useTopTracks()

  // Tocadas recentemente → agrupadas por álbum (sem repetir).
  const recentAlbums = useMemo(() => {
    const seen = new Set<string>()
    const out: Array<{ album: AlbumRef; track: Track }> = []
    for (const item of recent.data ?? []) {
      const album = item.track.album
      if (!album?.uri || seen.has(album.uri)) continue
      seen.add(album.uri)
      out.push({ album, track: item.track })
    }
    return out.slice(0, 20)
  }, [recent.data])

  const myPlaylists = flatPages(playlists.data).slice(0, 12)
  const firstName = me?.display_name?.split(' ')[0]

  return (
    <>
      <h1 className="t-title-large page-title enter">
        {greeting()}
        {firstName ? `, ${firstName}` : ''}
      </h1>

      {recentAlbums.length > 0 && (
        <Shelf title="Tocadas recentemente">
          {recentAlbums.map(({ album, track }, i) => (
            <MediaCard
              key={album.uri}
              index={i}
              title={album.name}
              subtitle={album.artists.map((a) => a.name).join(', ')}
              images={album.images}
              onOpen={() => album.id && navigate({ name: 'album', id: album.id })}
              onPlay={() => playSafe({ contextUri: album.uri, offsetUri: track.uri }, { uris: [track.uri] })}
            />
          ))}
        </Shelf>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="t-subtitle">Suas playlists</h2>
          <Button appearance="subtle" onClick={() => navigate({ name: 'playlists' })}>
            Ver tudo
          </Button>
        </div>
        {playlists.isLoading ? (
          <CardSkeletons count={6} />
        ) : playlists.error ? (
          <ErrorState error={playlists.error} onRetry={() => void playlists.refetch()} />
        ) : (
          <CardGrid>
            {myPlaylists.map((p, i) => (
              <MediaCard
                key={p.id}
                index={i}
                title={p.name}
                subtitle={p.owner.display_name ?? undefined}
                images={p.images}
                onOpen={() => navigate({ name: 'playlist', id: p.id })}
                onPlay={() => playSafe({ contextUri: p.uri })}
              />
            ))}
          </CardGrid>
        )}
      </section>

      {topTracks.data && topTracks.data.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="t-subtitle">Suas mais ouvidas</h2>
          </div>
          <TrackList
            tracks={topTracks.data}
            onPlay={(_, index) => playSafe({ uris: topTracks.data!.map((t) => t.uri), offsetIndex: index })}
          />
        </section>
      )}

      {topArtists.data && topArtists.data.length > 0 && (
        <Shelf title="Seus artistas favoritos">
          {topArtists.data.map((a, i) => (
            <MediaCard
              key={a.uri}
              index={i}
              round
              title={a.name}
              subtitle="Artista"
              images={a.images}
              onOpen={() => a.id && navigate({ name: 'artist', id: a.id })}
              onPlay={() => playSafe({ contextUri: a.uri })}
            />
          ))}
        </Shelf>
      )}
    </>
  )
}
