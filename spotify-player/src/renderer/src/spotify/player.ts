/**
 * Integração com o Spotify Web Playback SDK.
 * O app vira um dispositivo Spotify Connect ("Sonora") e toca o áudio aqui dentro via Widevine.
 */
import { create } from 'zustand'
import { notify } from '@/lib/notify'
import { useSettings } from '@/state/settings'
import { queryClient } from './queries'
import { spotify, SpotifyError } from './api'

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js'
export const DEVICE_NAME = 'Sonora'

export interface PlayerTrack {
  uri: string
  id: string | null
  name: string
  artists: { name: string; uri: string }[]
  album: { name: string; uri: string; images: { url: string; width?: number | null; height?: number | null }[] }
  duration: number
}

export type PlayerErrorKind = 'drm' | 'init' | 'auth' | 'account' | 'playback'

export interface PlayerError {
  kind: PlayerErrorKind
  message: string
}

interface PlayerState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  deviceId: string | null
  error: PlayerError | null
  /** Este app é o dispositivo ativo da conta. */
  active: boolean
  track: PlayerTrack | null
  paused: boolean
  /** Posição (ms) medida no instante `updatedAt` (performance.now()). */
  position: number
  updatedAt: number
  duration: number
  shuffle: boolean
  repeat: 0 | 1 | 2
  contextUri: string | null
  contextName: string | null
  nextTracks: PlayerTrack[]
  previousTracks: PlayerTrack[]
  volume: number
  muted: boolean
  buffering: boolean
  disallows: Spotify.PlaybackDisallows
}

export const usePlayer = create<PlayerState>(() => ({
  status: 'idle',
  deviceId: null,
  error: null,
  active: false,
  track: null,
  paused: true,
  position: 0,
  updatedAt: performance.now(),
  duration: 0,
  shuffle: false,
  repeat: 0,
  contextUri: null,
  contextName: null,
  nextTracks: [],
  previousTracks: [],
  volume: useSettings.getState().settings.volume,
  muted: false,
  buffering: false,
  disallows: {}
}))

/** Posição atual interpolada (sem re-render): usada pelas barras de progresso via requestAnimationFrame. */
export function currentPosition(): number {
  const s = usePlayer.getState()
  if (s.paused || !s.active || s.buffering) return s.position
  return Math.min(s.duration || Infinity, s.position + (performance.now() - s.updatedAt))
}

let player: Spotify.Player | null = null
let readyWaiters: Array<(id: string | null) => void> = []
let syncTimer: ReturnType<typeof setInterval> | null = null
let playbackErrorShown = false

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

function mapTrack(t: Spotify.Track | null | undefined): PlayerTrack | null {
  if (!t) return null
  return {
    uri: t.uri,
    id: t.id ?? null,
    name: t.name,
    artists: (t.artists ?? []).map((a) => ({ name: a.name, uri: a.uri })),
    album: { name: t.album?.name ?? '', uri: t.album?.uri ?? '', images: t.album?.images ?? [] },
    duration: t.duration_ms ?? 0
  }
}

function setError(kind: PlayerErrorKind, message: string): void {
  console.error(`[player] ${kind}: ${message}`)
  usePlayer.setState({ status: 'error', error: { kind, message } })
}

function loadSdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve()
  return new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve()
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onerror = () => reject(new Error('Não foi possível baixar o Spotify Web Playback SDK (sem internet?).'))
    document.head.appendChild(script)
  })
}

/** Verifica se o Widevine (com.widevine.alpha) está disponível para o EME. */
export async function widevineAvailable(): Promise<boolean> {
  if (!navigator.requestMediaKeySystemAccess) return false
  try {
    await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [
      {
        initDataTypes: ['cenc'],
        audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"', robustness: 'SW_SECURE_CRYPTO' }]
      }
    ])
    return true
  } catch {
    return false
  }
}

export async function initPlayer(): Promise<void> {
  if (player || usePlayer.getState().status === 'loading') return
  usePlayer.setState({ status: 'loading', error: null })

  if (!(await widevineAvailable())) {
    setError(
      'drm',
      'O Widevine (DRM) não está disponível. Use o Electron da castLabs e aguarde o download do CDM na primeira execução.'
    )
    // Quando o CDM terminar de instalar, recarrega a interface para o EME enxergá-lo.
    window.sonora.drm.onReady(() => window.location.reload())
    return
  }

  try {
    await loadSdk()
  } catch (err) {
    setError('init', (err as Error).message)
    return
  }

  const { settings } = useSettings.getState()
  player = new window.Spotify.Player({
    name: DEVICE_NAME,
    volume: settings.volume,
    // Integra com os controles de mídia do Windows (teclas de mídia e o painel de volume).
    enableMediaSession: settings.mediaSession,
    getOAuthToken: (cb) => {
      void window.sonora.auth.token().then((r) => {
        if (r.token) cb(r.token)
      })
    }
  })

  player.addListener('ready', ({ device_id }) => {
    console.log('[player] pronto, device_id =', device_id)
    usePlayer.setState({ status: 'ready', deviceId: device_id, error: null })
    readyWaiters.forEach((w) => w(device_id))
    readyWaiters = []
    if (useSettings.getState().settings.autoTransfer) void transferHere(true)
  })

  player.addListener('not_ready', ({ device_id }) => {
    console.warn('[player] dispositivo ficou offline', device_id)
    usePlayer.setState({ deviceId: null, active: false, status: 'loading' })
    setTimeout(() => void player?.connect(), 2000)
  })

  player.addListener('player_state_changed', (s) => onState(s))

  player.addListener('initialization_error', ({ message }) =>
    setError('init', `Falha ao iniciar o player (${message}). O navegador não suporta o DRM necessário.`)
  )
  player.addListener('authentication_error', ({ message }) =>
    setError('auth', `Falha de autenticação no player (${message}). Saia e entre novamente.`)
  )
  player.addListener('account_error', ({ message }) =>
    setError('account', `Sua conta não pode usar o player (${message}). É necessário Spotify Premium.`)
  )
  player.addListener('playback_error', ({ message }) => {
    console.error('[player] playback_error:', message)
    usePlayer.setState({ buffering: false })
    if (!playbackErrorShown) {
      playbackErrorShown = true
      usePlayer.setState({
        error: {
          kind: 'playback',
          message:
            'O Spotify recusou a licença de reprodução (Widevine). No Windows isso normalmente significa que o Electron ' +
            'precisa da assinatura VMP de produção (castLabs EVS). Veja o README, seção "VMP".'
        }
      })
    }
    notify('Não foi possível reproduzir', { body: message, intent: 'error' })
  })
  player.addListener('autoplay_failed', () => {
    notify('Reprodução automática bloqueada', { body: 'Clique em Reproduzir para começar.', intent: 'warning' })
  })

  const ok = await player.connect()
  if (!ok) setError('init', 'O player não conseguiu se conectar ao Spotify.')

  window.addEventListener('beforeunload', () => player?.disconnect())
}

function onState(s: Spotify.PlaybackState | null): void {
  if (!s) {
    // A reprodução foi para outro dispositivo.
    usePlayer.setState({ active: false, paused: true, buffering: false })
    stopSync()
    return
  }
  let position = s.position
  if (!s.paused && s.timestamp) position += Math.max(0, Math.min(3000, Date.now() - s.timestamp))
  const prevUri = usePlayer.getState().track?.uri
  const track = mapTrack(s.track_window?.current_track)
  usePlayer.setState({
    active: true,
    track,
    paused: s.paused,
    position,
    updatedAt: performance.now(),
    duration: s.duration,
    shuffle: s.shuffle,
    repeat: s.repeat_mode,
    contextUri: s.context?.uri ?? null,
    contextName: s.context?.metadata?.name ?? null,
    nextTracks: (s.track_window?.next_tracks ?? []).map(mapTrack).filter(Boolean) as PlayerTrack[],
    previousTracks: (s.track_window?.previous_tracks ?? []).map(mapTrack).filter(Boolean) as PlayerTrack[],
    buffering: Boolean(s.loading),
    disallows: s.disallows ?? {}
  })
  if (!s.paused) {
    playbackErrorShown = false
    const err = usePlayer.getState().error
    if (err?.kind === 'playback') usePlayer.setState({ error: null })
  }
  if (track && track.uri !== prevUri) {
    void queryClient.invalidateQueries({ queryKey: ['queue'] })
    void queryClient.invalidateQueries({ queryKey: ['me', 'recent'] })
  }
  if (s.paused) stopSync()
  else startSync()
}

/** Ressincroniza a posição a cada poucos segundos (corrige pequenas derivas). */
function startSync(): void {
  if (syncTimer) return
  syncTimer = setInterval(async () => {
    const s = await player?.getCurrentState()
    if (!s) return
    let position = s.position
    if (!s.paused && s.timestamp) position += Math.max(0, Math.min(3000, Date.now() - s.timestamp))
    usePlayer.setState({ position, updatedAt: performance.now(), paused: s.paused })
  }, 8000)
}
function stopSync(): void {
  if (syncTimer) clearInterval(syncTimer)
  syncTimer = null
}

function waitForDevice(timeoutMs = 12_000): Promise<string | null> {
  const id = usePlayer.getState().deviceId
  if (id) return Promise.resolve(id)
  return new Promise((resolve) => {
    readyWaiters.push(resolve)
    setTimeout(() => resolve(usePlayer.getState().deviceId), timeoutMs)
  })
}

/** Transfere a reprodução da conta para este app. */
export async function transferHere(automatic = false): Promise<void> {
  const deviceId = await waitForDevice()
  if (!deviceId) return
  let keepPlaying = false
  if (automatic) {
    try {
      const st = (await spotify.playbackState()) as { is_playing?: boolean; device?: { id?: string } } | undefined
      if (st?.device?.id === deviceId) return
      keepPlaying = Boolean(st?.is_playing)
    } catch {
      /* sem estado: nada tocando */
    }
  } else {
    keepPlaying = true
  }
  // Logo após o "ready" o Spotify às vezes ainda não conhece o dispositivo: tenta algumas vezes.
  for (const delay of [0, 700, 1500, 3000]) {
    if (delay) await sleep(delay)
    try {
      await spotify.transfer(deviceId, keepPlaying)
      return
    } catch (err) {
      if (err instanceof SpotifyError && (err.status === 404 || err.status === 502)) continue
      console.warn('[player] falha ao transferir', err)
      if (!automatic) notify('Não foi possível transferir a reprodução', { body: (err as Error).message, intent: 'error' })
      return
    }
  }
}

function explainError(err: unknown): string {
  if (err instanceof SpotifyError) {
    if (err.status === 403 && err.reason === 'PREMIUM_REQUIRED') return 'É necessário Spotify Premium.'
    if (err.status === 404) return 'Dispositivo não encontrado. Tente novamente em alguns segundos.'
    if (err.reason === 'UNKNOWN' || err.status === 403) return 'O Spotify não permitiu esta ação agora.'
    return err.message
  }
  return (err as Error)?.message ?? String(err)
}

export interface PlayRequest {
  contextUri?: string
  uris?: string[]
  offsetUri?: string
  offsetIndex?: number
}

/** Toca um contexto (álbum/playlist/artista) ou uma lista de URIs neste dispositivo. */
export async function play(req: PlayRequest): Promise<void> {
  const deviceId = await waitForDevice()
  if (!deviceId) {
    notify('O player ainda não está pronto', { body: usePlayer.getState().error?.message, intent: 'warning' })
    return
  }
  void player?.activateElement().catch(() => undefined)
  const body: Parameters<typeof spotify.play>[1] = {}
  if (req.contextUri) body.context_uri = req.contextUri
  if (req.uris) body.uris = req.uris.slice(0, 500)
  if (req.offsetUri) body.offset = { uri: req.offsetUri }
  else if (req.offsetIndex !== undefined) body.offset = { position: req.offsetIndex }
  usePlayer.setState({ buffering: true })
  try {
    await spotify.play(deviceId, body)
  } catch (err) {
    // Dispositivo recém-registrado: transfere e tenta mais uma vez.
    if (err instanceof SpotifyError && err.status === 404) {
      await transferHere(false)
      try {
        await spotify.play(deviceId, body)
        return
      } catch (err2) {
        err = err2
      }
    }
    usePlayer.setState({ buffering: false })
    throw err
  }
}

/** Wrapper que mostra um aviso amigável em caso de erro. */
export function playSafe(req: PlayRequest, fallback?: PlayRequest): void {
  play(req).catch(async (err) => {
    if (fallback) {
      try {
        await play(fallback)
        return
      } catch (err2) {
        err = err2
      }
    }
    notify('Não foi possível tocar', { body: explainError(err), intent: 'error' })
  })
}

// ─── Controles ─────────────────────────────────────────────────────────────────────────────
async function ensureActive(): Promise<boolean> {
  const s = usePlayer.getState()
  if (s.active) return true
  if (!s.deviceId) {
    notify('O player ainda não está pronto', { body: s.error?.message, intent: 'warning' })
    return false
  }
  await transferHere(false)
  return true
}

export async function togglePlay(): Promise<void> {
  if (!player) return
  const before = usePlayer.getState()
  if (!before.active) {
    // Não estava ativo: a transferência (play: true) já começa a tocar. Chamar togglePlay() depois
    // pausaria de novo — era o bug do "aperto play e não toca".
    if (!before.deviceId) {
      notify('O player ainda não está pronto', { body: before.error?.message, intent: 'warning' })
      return
    }
    usePlayer.setState({ paused: false, buffering: true })
    await transferHere(false)
    return
  }
  const s = usePlayer.getState()
  // Atualização otimista para resposta instantânea na interface.
  usePlayer.setState({ paused: !s.paused, position: currentPosition(), updatedAt: performance.now() })
  await player.togglePlay().catch(() => undefined)
}

export async function nextTrack(): Promise<void> {
  if (!player || !(await ensureActive())) return
  await player.nextTrack().catch(() => undefined)
}

export async function previousTrack(): Promise<void> {
  if (!player || !(await ensureActive())) return
  // Comportamento comum dos players: após 3 s, "anterior" volta ao início da faixa.
  if (currentPosition() > 3000) return seek(0)
  await player.previousTrack().catch(() => undefined)
}

export async function seek(ms: number): Promise<void> {
  if (!player) return
  const s = usePlayer.getState()
  const pos = Math.max(0, Math.min(ms, s.duration || ms))
  usePlayer.setState({ position: pos, updatedAt: performance.now() })
  await player.seek(Math.round(pos)).catch(() => undefined)
}

let volumeSaveTimer: ReturnType<typeof setTimeout> | null = null
export function setVolume(v: number): void {
  const volume = Math.max(0, Math.min(1, v))
  usePlayer.setState({ volume, muted: volume === 0 ? usePlayer.getState().muted : false })
  void player?.setVolume(Math.max(volume, 0.0001)).catch(() => undefined)
  if (volumeSaveTimer) clearTimeout(volumeSaveTimer)
  volumeSaveTimer = setTimeout(() => useSettings.getState().update({ volume }), 400)
}

export function toggleMute(): void {
  const s = usePlayer.getState()
  const muted = !s.muted
  usePlayer.setState({ muted })
  void player?.setVolume(muted ? 0.0001 : Math.max(s.volume, 0.05)).catch(() => undefined)
}

export async function toggleShuffle(): Promise<void> {
  if (!(await ensureActive())) return
  const s = usePlayer.getState()
  const next = !s.shuffle
  usePlayer.setState({ shuffle: next })
  try {
    await spotify.shuffle(next, s.deviceId ?? undefined)
  } catch (err) {
    usePlayer.setState({ shuffle: s.shuffle })
    notify('Não foi possível alterar o modo aleatório', { body: explainError(err), intent: 'error' })
  }
}

export async function cycleRepeat(): Promise<void> {
  if (!(await ensureActive())) return
  const s = usePlayer.getState()
  const next = ((s.repeat + 1) % 3) as 0 | 1 | 2
  usePlayer.setState({ repeat: next })
  try {
    await spotify.repeat((['off', 'context', 'track'] as const)[next], s.deviceId ?? undefined)
  } catch (err) {
    usePlayer.setState({ repeat: s.repeat })
    notify('Não foi possível alterar a repetição', { body: explainError(err), intent: 'error' })
  }
}

export async function addToQueue(uri: string): Promise<void> {
  try {
    await spotify.addToQueue(uri, usePlayer.getState().deviceId ?? undefined)
    notify('Adicionada à fila', { intent: 'success', timeout: 2500 })
    void queryClient.invalidateQueries({ queryKey: ['queue'] })
  } catch (err) {
    notify('Não foi possível adicionar à fila', { body: explainError(err), intent: 'error' })
  }
}
