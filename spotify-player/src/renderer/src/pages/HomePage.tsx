import { Button } from '@fluentui/react-components'
import { HeartFilled } from '@fluentui/react-icons'
import { useMemo } from 'react'
import { greeting } from '@/lib/format'
import { navigate } from '@/state/nav'
import { playSafe } from '@/spotify/player'
import { likedContextUri, playLiked } from '@/spotify/actions'
import { flatPages, useMe, useMyPlaylists, useRecentlyPlayed, useSavedTracks, useTopArtists, useTopTracks } from '@/spotify/queries'
import type { AlbumRef, Track } from '@/spotify/types'
import { FeaturedBanner } from '@/components/FeaturedBanner'
import { CardSkeletons, MediaCard, QuickTile, Shelf, TrackGrid } from '@/components/MediaCard'
import { ErrorState } from '@/components/States'

const today = (): string => {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function HomePage() {
  const { data: me } = useMe()
  const recent = useRecentlyPlayed()
  const playlists = useMyPlaylists()
  const topArtists = useTopArtists()
  const topTracks = useTopTracks()
  const liked = useSavedTracks()

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

  const myPlaylists = flatPages(playlists.data)
  const likedTracks = flatPages(liked.data)
  const firstName = me?.display_name?.split(' ')[0]
  const likedCtx = likedContextUri()

  return (
    <div className="home">
      <header className="home-head enter">
        <span className="eyebrow">{today()}</span>
        <h1 className="home-title display">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </h1>
      </header>

      <FeaturedBanner recent={recent.data?.[0]?.track ?? null} />

      {myPlaylists.length > 0 && (
        <section className="section">
          <div className="quick-grid stagger">
            <QuickTile
              index={0}
              title="Músicas curtidas"
              art={
                <div className="liked-art" style={{ width: '100%', height: '100%' }}>
                  <HeartFilled fontSize={26} />
                </div>
              }
              contextUri={likedCtx}
              onOpen={() => navigate({ name: 'liked' })}
              onPlay={() => likedTracks.length && playLiked(likedTracks, 0)}
            />
            {myPlaylists.slice(0, 7).map((p, i) => (
              <QuickTile
                key={p.id}
                index={i + 1}
                title={p.name}
                images={p.images}
                contextUri={p.uri}
                onOpen={() => navigate({ name: 'playlist', id: p.id })}
                onPlay={() => playSafe({ contextUri: p.uri })}
              />
            ))}
          </div>
        </section>
      )}

      {recentAlbums.length > 0 && (
        <Shelf title="Tocadas recentemente">
          {recentAlbums.map(({ album, track }, i) => (
            <MediaCard
              key={album.uri}
              index={i}
              title={album.name}
              subtitle={album.artists.map((a) => a.name).join(', ')}
              images={album.images}
              contextUri={album.uri}
              onOpen={() => album.id && navigate({ name: 'album', id: album.id })}
              onPlay={() => playSafe({ contextUri: album.uri, offsetUri: track.uri }, { uris: [track.uri] })}
            />
          ))}
        </Shelf>
      )}

      {topTracks.data && topTracks.data.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Suas mais ouvidas</h2>
            <span className="text-3 t-caption">Últimas 4 semanas</span>
          </div>
          <TrackGrid
            tracks={topTracks.data.slice(0, 12)}
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
              contextUri={a.uri}
              onOpen={() => a.id && navigate({ name: 'artist', id: a.id })}
              onPlay={() => playSafe({ contextUri: a.uri })}
            />
          ))}
        </Shelf>
      )}

      {playlists.isLoading ? (
        <section className="section">
          <CardSkeletons count={6} />
        </section>
      ) : playlists.error ? (
        <ErrorState error={playlists.error} onRetry={() => void playlists.refetch()} />
      ) : (
        myPlaylists.length > 0 && (
          <Shelf
            title="Suas playlists"
            action={
              <Button appearance="subtle" onClick={() => navigate({ name: 'playlists' })}>
                Ver tudo
              </Button>
            }
          >
            {myPlaylists.slice(0, 20).map((p, i) => (
              <MediaCard
                key={p.id}
                index={i}
                title={p.name}
                subtitle={p.owner.display_name ?? undefined}
                images={p.images}
                contextUri={p.uri}
                onOpen={() => navigate({ name: 'playlist', id: p.id })}
                onPlay={() => playSafe({ contextUri: p.uri })}
              />
            ))}
          </Shelf>
        )
      )}
    </div>
  )
}
