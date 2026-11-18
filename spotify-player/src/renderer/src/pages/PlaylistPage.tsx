import { useCallback, useMemo } from 'react'
import { formatLongDuration, plural, stripHtml } from '@/lib/format'
import { playSafe } from '@/spotify/player'
import { shuffleContext } from '@/spotify/actions'
import { flatPages, usePlaylist, usePlaylistTracks } from '@/spotify/queries'
import type { Track } from '@/spotify/types'
import { Hero } from '@/components/Hero'
import { TrackList } from '@/components/TrackList'
import { EmptyState, ErrorState } from '@/components/States'

export function PlaylistPage({ id }: { id: string }) {
  const pl = usePlaylist(id)
  const q = usePlaylistTracks(id)
  const tracks = useMemo(() => flatPages(q.data), [q.data])
  const loadedDuration = useMemo(() => tracks.reduce((s, t) => s + t.duration_ms, 0), [tracks])
  const total = pl.data?.total ?? tracks.length
  const uri = pl.data?.uri ?? `spotify:playlist:${id}`

  const onPlay = useCallback(
    (track: Track, index: number) =>
      playSafe({ contextUri: uri, offsetUri: track.uri }, { uris: tracks.slice(index, index + 300).map((t) => t.uri) }),
    [uri, tracks]
  )
  const loadMore = useCallback(() => void q.fetchNextPage(), [q])

  if (pl.error) return <ErrorState error={pl.error} onRetry={() => void pl.refetch()} />

  return (
    <>
      <Hero
        kind="Playlist"
        title={pl.data?.name ?? ' '}
        images={pl.data?.images}
        description={stripHtml(pl.data?.description) || undefined}
        meta={[
          pl.data?.owner.display_name ?? '',
          plural(total, 'música', 'músicas'),
          loadedDuration ? `${q.hasNextPage ? 'mais de ' : ''}${formatLongDuration(loadedDuration)}` : ''
        ].filter(Boolean)}
        onPlay={tracks.length ? () => playSafe({ contextUri: uri }, { uris: tracks.slice(0, 300).map((t) => t.uri) }) : undefined}
        onShuffle={tracks.length ? () => void shuffleContext(uri, total, tracks.map((t) => t.uri)) : undefined}
      />
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.isLoading && tracks.length === 0 ? (
        <EmptyState title="Esta playlist está vazia" />
      ) : (
        <TrackList
          tracks={tracks}
          contextUri={uri}
          onPlay={onPlay}
          hasMore={q.hasNextPage}
          loadMore={loadMore}
          loadingMore={q.isFetchingNextPage}
          placeholderCount={q.isLoading ? 10 : 0}
        />
      )}
    </>
  )
}
