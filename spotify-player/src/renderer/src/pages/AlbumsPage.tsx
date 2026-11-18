import { AlbumRegular } from '@fluentui/react-icons'
import { useEffect, useRef } from 'react'
import { year } from '@/lib/format'
import { navigate } from '@/state/nav'
import { playSafe } from '@/spotify/player'
import { flatPages, useSavedAlbums } from '@/spotify/queries'
import { CardGrid, CardSkeletons, MediaCard } from '@/components/MediaCard'
import { EmptyState, ErrorState } from '@/components/States'

export function useInfiniteSentinel(hasNext: boolean | undefined, fetching: boolean, fetchNext: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && hasNext && !fetching) fetchNext()
    }, { rootMargin: '800px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasNext, fetching, fetchNext])
  return ref
}

export function AlbumsPage() {
  const q = useSavedAlbums()
  const albums = flatPages(q.data)
  const sentinel = useInfiniteSentinel(q.hasNextPage, q.isFetchingNextPage, () => void q.fetchNextPage())
  return (
    <>
      <h1 className="t-title-large page-title">Álbuns</h1>
      {q.isLoading ? (
        <CardSkeletons count={12} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : albums.length === 0 ? (
        <EmptyState icon={<AlbumRegular />} title="Nenhum álbum salvo">
          Os álbuns que você salvar no Spotify aparecem aqui.
        </EmptyState>
      ) : (
        <CardGrid>
          {albums.map((a, i) => (
            <MediaCard
              key={a.uri}
              index={i}
              title={a.name}
              subtitle={[a.artists.map((x) => x.name).join(', '), year(a.release_date)].filter(Boolean).join(' • ')}
              images={a.images}
              onOpen={() => a.id && navigate({ name: 'album', id: a.id })}
              onPlay={() => playSafe({ contextUri: a.uri })}
            />
          ))}
        </CardGrid>
      )}
      <div ref={sentinel} />
    </>
  )
}
