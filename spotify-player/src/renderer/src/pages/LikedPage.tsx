import { HeartFilled } from '@fluentui/react-icons'
import { useCallback, useEffect, useMemo } from 'react'
import { formatLongDuration, plural } from '@/lib/format'
import { playLiked } from '@/spotify/actions'
import { flatPages, primeLiked, useSavedTracks } from '@/spotify/queries'
import type { Track } from '@/spotify/types'
import { Hero } from '@/components/Hero'
import { TrackList } from '@/components/TrackList'
import { EmptyState, ErrorState } from '@/components/States'
import { shuffleContext, likedContextUri } from '@/spotify/actions'

export function LikedArt({ size = 216 }: { size?: number }) {
  return (
    <div className="liked-art hero-art" style={{ width: size, height: size }}>
      <HeartFilled fontSize={size * 0.36} />
    </div>
  )
}

export function LikedPage() {
  const q = useSavedTracks()
  const tracks = useMemo(() => flatPages(q.data), [q.data])
  const total = q.data?.pages[0]?.total ?? tracks.length
  const duration = useMemo(() => tracks.reduce((s, t) => s + t.duration_ms, 0), [tracks])

  // Tudo que aparece aqui está curtido: preenche o cache dos corações sem novas requisições.
  useEffect(() => primeLiked(tracks.map((t) => t.uri)), [tracks])

  const onPlay = useCallback((_: Track, index: number) => playLiked(tracks, index), [tracks])
  const loadMore = useCallback(() => void q.fetchNextPage(), [q])
  const ctx = likedContextUri()

  return (
    <>
      <Hero
        kind="Playlist"
        title="Músicas curtidas"
        art={<LikedArt />}
        meta={[plural(total, 'música', 'músicas'), duration ? `${q.hasNextPage ? 'mais de ' : ''}${formatLongDuration(duration)}` : '']}
        onPlay={tracks.length ? () => playLiked(tracks, 0) : undefined}
        onShuffle={
          tracks.length
            ? () => (ctx ? void shuffleContext(ctx, total, tracks.map((t) => t.uri)) : playLiked(tracks, Math.floor(Math.random() * tracks.length)))
            : undefined
        }
      />
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.isLoading && tracks.length === 0 ? (
        <EmptyState icon={<HeartFilled />} title="Nenhuma música curtida ainda">
          Toque no coração ao lado de uma música para salvá-la aqui.
        </EmptyState>
      ) : (
        <TrackList
          tracks={tracks}
          onPlay={onPlay}
          contextUri={ctx ?? undefined}
          hasMore={q.hasNextPage}
          loadMore={loadMore}
          loadingMore={q.isFetchingNextPage}
          placeholderCount={q.isLoading ? 12 : 0}
        />
      )}
    </>
  )
}
