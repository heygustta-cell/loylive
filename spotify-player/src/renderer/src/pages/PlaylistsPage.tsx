import { LibraryRegular } from '@fluentui/react-icons'
import { plural } from '@/lib/format'
import { navigate } from '@/state/nav'
import { playSafe } from '@/spotify/player'
import { flatPages, useMyPlaylists } from '@/spotify/queries'
import { CardGrid, CardSkeletons, MediaCard } from '@/components/MediaCard'
import { EmptyState, ErrorState } from '@/components/States'
import { useInfiniteSentinel } from './AlbumsPage'
import { LikedArt } from './LikedPage'

export function PlaylistsPage() {
  const q = useMyPlaylists()
  const playlists = flatPages(q.data)
  const sentinel = useInfiniteSentinel(q.hasNextPage, q.isFetchingNextPage, () => void q.fetchNextPage())
  return (
    <>
      <h1 className="t-title-large page-title">Playlists</h1>
      {q.isLoading ? (
        <CardSkeletons count={12} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <CardGrid>
          <div className="card reveal" role="button" tabIndex={0} onClick={() => navigate({ name: 'liked' })}>
            <div className="card-art-wrap">
              <div className="art" style={{ position: 'absolute', inset: 0 }}>
                <LikedArt size={176} />
              </div>
            </div>
            <span className="card-title">Músicas curtidas</span>
            <span className="card-sub">Playlist automática</span>
          </div>
          {playlists.map((p, i) => (
            <MediaCard
              key={p.id}
              index={i + 1}
              title={p.name}
              subtitle={[p.owner.display_name, plural(p.total, 'música', 'músicas')].filter(Boolean).join(' • ')}
              images={p.images}
              onOpen={() => navigate({ name: 'playlist', id: p.id })}
              onPlay={() => playSafe({ contextUri: p.uri })}
            />
          ))}
        </CardGrid>
      )}
      {!q.isLoading && !q.error && playlists.length === 0 && (
        <EmptyState icon={<LibraryRegular />} title="Você ainda não tem playlists" />
      )}
      <div ref={sentinel} />
    </>
  )
}
