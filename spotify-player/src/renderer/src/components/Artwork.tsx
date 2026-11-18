import { MusicNote2Regular } from '@fluentui/react-icons'
import { memo, useState } from 'react'
import { pickImage } from '@/spotify/api'
import type { SpotifyImage } from '@/spotify/types'

interface Props {
  images?: SpotifyImage[] | null
  /** Tamanho exibido em px (usado para escolher a resolução certa). */
  size: number
  round?: boolean
  className?: string
  alt?: string
  eager?: boolean
}

/** Capa com fade-in suave ao terminar de carregar (opacidade → GPU). */
export const Artwork = memo(function Artwork({ images, size, round, className, alt = '', eager }: Props) {
  const src = pickImage(images, size)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  return (
    <div className={`art${round ? ' round' : ''}${className ? ` ${className}` : ''}`}>
      {src ? (
        <img
          key={src}
          src={src}
          alt={alt}
          draggable={false}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={loadedSrc === src ? 'loaded' : undefined}
          onLoad={() => setLoadedSrc(src)}
        />
      ) : (
        <div className="art-ph">
          <MusicNote2Regular />
        </div>
      )}
    </div>
  )
})
