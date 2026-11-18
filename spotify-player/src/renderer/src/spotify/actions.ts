import { notify } from '@/lib/notify'
import { spotify } from './api'
import { play, playSafe, usePlayer } from './player'
import { queryClient } from './queries'
import type { Track, User } from './types'

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** Toca um contexto começando numa faixa aleatória, com o modo aleatório ativado. */
export async function shuffleContext(contextUri: string, total: number, fallbackUris?: string[]): Promise<void> {
  try {
    const offsetIndex = total > 0 ? Math.floor(Math.random() * total) : undefined
    await play({ contextUri, offsetIndex })
    await sleep(350)
    await spotify.shuffle(true, usePlayer.getState().deviceId ?? undefined)
    usePlayer.setState({ shuffle: true })
  } catch (err) {
    if (fallbackUris?.length) {
      const uris = [...fallbackUris].sort(() => Math.random() - 0.5)
      playSafe({ uris })
      return
    }
    notify('Não foi possível tocar no modo aleatório', { body: (err as Error).message, intent: 'error' })
  }
}

/** URI de contexto das "Músicas curtidas" do usuário. */
export function likedContextUri(): string | null {
  const me = queryClient.getQueryData<User>(['me'])
  return me ? `spotify:user:${me.id}:collection` : null
}

/** Toca a lista de curtidas a partir de uma faixa (com fallback para uma lista de URIs). */
export function playLiked(tracks: Track[], index: number): void {
  const ctx = likedContextUri()
  const uris = tracks.slice(index, index + 300).map((t) => t.uri)
  if (ctx) playSafe({ contextUri: ctx, offsetUri: tracks[index].uri }, { uris })
  else playSafe({ uris })
}
