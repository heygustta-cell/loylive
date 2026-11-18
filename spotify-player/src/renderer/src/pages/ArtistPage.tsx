import { Button } from '@fluentui/react-components'
import { useEffect, useRef } from 'react'
import { albumType, year } from '@/lib/format'
import { navigate } from '@/state/nav'
import { playSafe } from '@/spotify/player'
import { flatPages, useArtist, useArtistAlbums } from '@/spotify/queries'
import { Hero } from '@/components/Hero'
import { CardGrid, CardSkeletons, MediaCard } from '@/components/MediaCard'
import { ErrorState } from '@/components/States'

export function ArtistPage({ id }: { id: string }) {
  const artist = useArtist(id)
  const albums = useArtistAlbums(id)
  const list = flatPages(albums.data)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && albums.hasNextPage && !albums.isFetchingNextPage) void albums.fetchNextPage()
    }, { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [albums])

  if (artist.error) return <ErrorState error={artist.error} onRetry={() => void artist.refetch()} />
  const uri = artist.data?.uri ?? `spotify:artist:${id}`

  return (
    <>
      <Hero
        kind="Artista"
        title={artist.data?.name ?? ' '}
        images={artist.data?.images}
        round
        meta={artist.data?.genres?.length ? [artist.data.genres.slice(0, 3).join(', ')] : []}
        onPlay={() => playSafe({ contextUri: uri })}
      />
      <section className="section">
        <div className="section-head">
          <h2 className="t-subtitle">Discografia</h2>
        </div>
        {albums.isLoading ? (
          <CardSkeletons />
        ) : albums.error ? (
          <ErrorState error={albums.error} onRetry={() => void albums.refetch()} />
        ) : (
          <CardGrid>
            {list.map((a, i) => (
              <MediaCard
                key={a.uri}
                index={i}
                title={a.name}
                subtitle={[year(a.release_date), albumType(a.album_type)].filter(Boolean).join(' • ')}
                images={a.images}
                onOpen={() => a.id && navigate({ name: 'album', id: a.id })}
                onPlay={() => playSafe({ contextUri: a.uri })}
              />
            ))}
          </CardGrid>
        )}
        <div ref={sentinel} />
        {albums.hasNextPage && (
          <div className="load-more">
            <Button appearance="subtle" onClick={() => void albums.fetchNextPage()} disabled={albums.isFetchingNextPage}>
              Carregar mais
            </Button>
          </div>
        )}
      </section>
    </>
  )
}
