import { Fragment, useCallback, useEffect, useMemo } from 'react'
import { albumType, formatLongDuration, plural, year } from '@/lib/format'
import { openUri } from '@/state/nav'
import { playSafe } from '@/spotify/player'
import { shuffleContext } from '@/spotify/actions'
import { flatPages, useAlbum, useAlbumMoreTracks } from '@/spotify/queries'
import type { Track } from '@/spotify/types'
import { Hero } from '@/components/Hero'
import { TrackList } from '@/components/TrackList'
import { ErrorState } from '@/components/States'

export function AlbumPage({ id }: { id: string }) {
  const q = useAlbum(id)
  const album = q.data?.album
  const more = useAlbumMoreTracks(id, album, q.data?.tracks)
  const tracks = useMemo(() => [...(q.data?.tracks.items ?? []), ...flatPages(more.data)], [q.data, more.data])
  const duration = useMemo(() => tracks.reduce((s, t) => s + t.duration_ms, 0), [tracks])
  const uri = album?.uri ?? `spotify:album:${id}`

  // Álbuns longos: carrega as páginas restantes automaticamente.
  useEffect(() => {
    if (more.hasNextPage && !more.isFetchingNextPage) void more.fetchNextPage()
  }, [more.hasNextPage, more.isFetchingNextPage, more])

  const onPlay = useCallback((track: Track) => playSafe({ contextUri: uri, offsetUri: track.uri }, { uris: [track.uri] }), [uri])

  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />

  return (
    <>
      <Hero
        kind={albumType(album?.album_type)}
        title={album?.name ?? ' '}
        images={album?.images}
        meta={[
          <span key="a">
            {album?.artists.map((a, i) => (
              <Fragment key={a.uri || i}>
                {i > 0 && ', '}
                <button className="link" style={{ fontWeight: 600, color: 'var(--text-1)' }} onClick={() => openUri(a.uri)}>
                  {a.name}
                </button>
              </Fragment>
            ))}
          </span>,
          year(album?.release_date),
          plural(album?.total_tracks ?? tracks.length, 'música', 'músicas'),
          duration ? formatLongDuration(duration) : ''
        ].filter(Boolean)}
        onPlay={tracks.length ? () => playSafe({ contextUri: uri }) : undefined}
        onShuffle={tracks.length ? () => void shuffleContext(uri, tracks.length, tracks.map((t) => t.uri)) : undefined}
      />
      <TrackList
        tracks={tracks}
        contextUri={uri}
        onPlay={onPlay}
        showAlbum={false}
        showArt={false}
        trackNumbers
        placeholderCount={q.isLoading ? 10 : 0}
      />
      {album?.copyrights?.[0] && (
        <p className="t-caption text-3" style={{ marginTop: 24 }}>
          {album.copyrights[0].text}
        </p>
      )}
    </>
  )
}
