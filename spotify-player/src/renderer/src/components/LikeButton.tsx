import { HeartFilled, HeartRegular } from '@fluentui/react-icons'
import { Tooltip } from '@fluentui/react-components'
import { toggleLiked, useIsLiked } from '@/spotify/queries'
import { notify } from '@/lib/notify'

export function LikeButton({ uri, size = 'sm' }: { uri: string | null | undefined; size?: 'sm' | 'md' }) {
  const liked = useIsLiked(uri)
  if (!uri || !uri.startsWith('spotify:track:')) return <span />
  const label = liked ? 'Remover das curtidas' : 'Curtir'
  return (
    <Tooltip content={label} relationship="label" withArrow>
      <button
        className={size === 'md' ? 'ctl ctl-sm like-btn' : 'like-btn'}
        data-liked={liked ? 'true' : 'false'}
        onClick={(e) => {
          e.stopPropagation()
          toggleLiked(uri)
            .then((now) => notify(now ? 'Adicionada às Músicas curtidas' : 'Removida das Músicas curtidas', { intent: 'success', timeout: 2200 }))
            .catch((err: Error) => notify('Não foi possível atualizar a curtida', { body: err.message, intent: 'error' }))
        }}
      >
        {liked ? <HeartFilled /> : <HeartRegular />}
      </button>
    </Tooltip>
  )
}
