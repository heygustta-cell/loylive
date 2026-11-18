import { Menu, MenuDivider, MenuItem, MenuList, MenuPopover } from '@fluentui/react-components'
import {
  AlbumRegular,
  CopyRegular,
  HeartFilled,
  HeartRegular,
  PersonRegular,
  PlayRegular,
  TextBulletListAddRegular
} from '@fluentui/react-icons'
import { useMemo } from 'react'
import { notify } from '@/lib/notify'
import { openUri } from '@/state/nav'
import { useUi } from '@/state/ui'
import { addToQueue, playSafe } from '@/spotify/player'
import { toggleLiked, useIsLiked } from '@/spotify/queries'

/** Menu de contexto (botão direito) compartilhado por todas as listas de faixas. */
export function TrackContextMenu() {
  const menu = useUi((s) => s.contextMenu)
  const close = useUi((s) => s.closeContextMenu)
  const liked = useIsLiked(menu?.track.uri)

  const target = useMemo(
    () =>
      menu
        ? {
            getBoundingClientRect: () => new DOMRect(menu.x, menu.y, 0, 0)
          }
        : null,
    [menu]
  )
  if (!menu || !target) return null
  const { track, contextUri } = menu
  const isTrack = track.uri.startsWith('spotify:track:')
  const trackUrl = track.id ? `https://open.spotify.com/${track.type}/${track.id}` : null

  return (
    <Menu
      open
      onOpenChange={(_, d) => {
        if (!d.open) close()
      }}
      positioning={{ target, position: 'below', align: 'start', offset: 4 }}
    >
      <MenuPopover>
        <MenuList>
          <MenuItem
            icon={<PlayRegular />}
            onClick={() =>
              playSafe(contextUri ? { contextUri, offsetUri: track.uri } : { uris: [track.uri] }, { uris: [track.uri] })
            }
          >
            Tocar
          </MenuItem>
          <MenuItem icon={<TextBulletListAddRegular />} onClick={() => void addToQueue(track.uri)}>
            Adicionar à fila
          </MenuItem>
          <MenuDivider />
          {track.album?.uri && track.type === 'track' && (
            <MenuItem icon={<AlbumRegular />} onClick={() => openUri(track.album?.uri)}>
              Ir para o álbum
            </MenuItem>
          )}
          {track.artists
            .filter((a) => a.uri)
            .slice(0, 3)
            .map((a) => (
              <MenuItem key={a.uri} icon={<PersonRegular />} onClick={() => openUri(a.uri)}>
                {track.artists.length > 1 ? `Ir para ${a.name}` : 'Ir para o artista'}
              </MenuItem>
            ))}
          {isTrack && (
            <>
              <MenuDivider />
              <MenuItem
                icon={liked ? <HeartFilled /> : <HeartRegular />}
                onClick={() =>
                  toggleLiked(track.uri).catch((err: Error) =>
                    notify('Não foi possível atualizar a curtida', { body: err.message, intent: 'error' })
                  )
                }
              >
                {liked ? 'Remover das Músicas curtidas' : 'Salvar em Músicas curtidas'}
              </MenuItem>
            </>
          )}
          {trackUrl && (
            <MenuItem
              icon={<CopyRegular />}
              onClick={() => {
                void navigator.clipboard.writeText(trackUrl)
                notify('Link copiado', { intent: 'success', timeout: 2000 })
              }}
            >
              Copiar link
            </MenuItem>
          )}
        </MenuList>
      </MenuPopover>
    </Menu>
  )
}
