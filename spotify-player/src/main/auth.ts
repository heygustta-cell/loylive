import { app, BrowserWindow, net, safeStorage, session, shell } from 'electron'
import { EventEmitter } from 'node:events'
import { createHash, randomBytes } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { settings } from './settings'
import type { AuthState, LoginMode, LoginResult } from '@shared/types'

/**
 * Redirect URI cadastrada no Spotify Developer Dashboard.
 * Ela NÃO precisa de um servidor rodando: a janela de login intercepta o redirecionamento
 * e, no modo "navegador", o próprio app escuta temporariamente nessa porta.
 */
export const REDIRECT_URI = 'http://127.0.0.1:5173/callback'
const REDIRECT_PORT = 5173

// As variáveis SONORA_TEST_* existem apenas para testes automatizados (servidor OAuth simulado).
const AUTHORIZE_URL = process.env.SONORA_TEST_AUTHORIZE_URL || 'https://accounts.spotify.com/authorize'
const TOKEN_URL = process.env.SONORA_TEST_TOKEN_URL || 'https://accounts.spotify.com/api/token'
const AUTH_PARTITION = 'persist:spotify-auth'

/** Escopos necessários: os três primeiros são exigidos pelo Web Playback SDK. */
export const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'user-library-read',
  'user-library-modify',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-follow-read'
]

interface TokenSet {
  accessToken: string
  refreshToken: string
  /** epoch em ms */
  expiresAt: number
  scope: string
  clientId: string
}

interface TokenResponse {
  access_token: string
  token_type: string
  scope: string
  expires_in: number
  refresh_token?: string
  error?: string
  error_description?: string
}

class AuthError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message)
  }
}

const base64url = (buf: Buffer): string =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** User-Agent de Chrome "limpo" (sem Electron), evita bloqueios em páginas de login. */
export function chromeUserAgent(): string {
  const major = process.versions.chrome.split('.')[0]
  const os =
    process.platform === 'win32'
      ? 'Windows NT 10.0; Win64; x64'
      : process.platform === 'darwin'
        ? 'Macintosh; Intel Mac OS X 10_15_7'
        : 'X11; Linux x86_64'
  return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`
}

class AuthManager extends EventEmitter {
  private tokens: TokenSet | null = null
  private refreshing: Promise<string> | null = null
  private loginInProgress: Promise<LoginResult> | null = null
  private cancelCurrentLogin: (() => void) | null = null
  private forceDialog = false

  private get file(): string {
    return join(app.getPath('userData'), 'auth.dat')
  }

  load(): void {
    try {
      if (!existsSync(this.file)) return
      const raw = readFileSync(this.file)
      let json: string
      if (raw.subarray(0, 6).toString() === 'PLAIN:') {
        json = raw.subarray(6).toString('utf-8')
      } else if (safeStorage.isEncryptionAvailable()) {
        json = safeStorage.decryptString(raw)
      } else {
        return
      }
      this.tokens = JSON.parse(json) as TokenSet
    } catch (err) {
      console.warn('[auth] não foi possível ler os tokens salvos:', err)
      this.tokens = null
    }
  }

  private persist(): void {
    try {
      if (!this.tokens) {
        if (existsSync(this.file)) unlinkSync(this.file)
        return
      }
      const json = JSON.stringify(this.tokens)
      const data = safeStorage.isEncryptionAvailable()
        ? safeStorage.encryptString(json)
        : Buffer.from(`PLAIN:${json}`, 'utf-8')
      writeFileSync(this.file, data)
    } catch (err) {
      console.error('[auth] falha ao salvar tokens:', err)
    }
  }

  clientId(): { id: string; source: AuthState['clientIdSource'] } {
    const fromSettings = settings.get().clientId
    if (fromSettings) return { id: fromSettings, source: 'settings' }
    const fromEnv = (import.meta.env.MAIN_VITE_SPOTIFY_CLIENT_ID ?? '').trim()
    if (fromEnv && !/^cole/i.test(fromEnv)) return { id: fromEnv, source: 'env' }
    return { id: '', source: 'none' }
  }

  state(): AuthState {
    const { id, source } = this.clientId()
    return {
      loggedIn: Boolean(this.tokens && id && this.tokens.clientId === id),
      hasClientId: Boolean(id),
      clientIdSource: source,
      redirectUri: REDIRECT_URI,
      scopes: SCOPES
    }
  }

  private setTokens(tokens: TokenSet | null): void {
    const wasLoggedIn = this.state().loggedIn
    this.tokens = tokens
    this.persist()
    if (wasLoggedIn !== this.state().loggedIn) this.emit('change', this.state())
  }

  /** Chamado quando o Client ID muda nas configurações. */
  notifyClientIdChanged(): void {
    this.emit('change', this.state())
  }

  async logout(): Promise<void> {
    this.forceDialog = true
    this.setTokens(null)
    // Limpa os cookies da janela de login para permitir trocar de conta.
    try {
      await session.fromPartition(AUTH_PARTITION).clearStorageData()
    } catch {
      /* ignora */
    }
  }

  login(mode: LoginMode, parent: BrowserWindow | null): Promise<LoginResult> {
    if (this.loginInProgress) {
      // Um novo pedido cancela o anterior (ex.: trocou de "janela" para "navegador").
      this.cancelCurrentLogin?.()
    }
    const run = this.runLogin(mode, parent)
      .then((): LoginResult => ({ ok: true }))
      .catch((err: unknown): LoginResult => {
        const e = err as AuthError
        console.warn('[auth] login falhou:', e.message)
        return { ok: false, error: e.code === 'cancelled' ? 'cancelled' : e.message }
      })
      .finally(() => {
        if (this.loginInProgress === run) {
          this.loginInProgress = null
          this.cancelCurrentLogin = null
        }
      })
    this.loginInProgress = run
    return run
  }

  private async runLogin(mode: LoginMode, parent: BrowserWindow | null): Promise<void> {
    const { id: clientId } = this.clientId()
    if (!clientId) throw new AuthError('Configure o Client ID do Spotify antes de entrar.', 'no_client_id')

    const verifier = base64url(randomBytes(64))
    const challenge = base64url(createHash('sha256').update(verifier).digest())
    const state = base64url(randomBytes(16))

    const url = new URL(AUTHORIZE_URL)
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SCOPES.join(' '),
      redirect_uri: REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
      ...(this.forceDialog ? { show_dialog: 'true' } : {})
    }).toString()

    const callbackUrl =
      mode === 'browser' ? await this.loginWithBrowser(url.toString()) : await this.loginWithWindow(url.toString(), parent)

    const params = new URL(callbackUrl).searchParams
    const error = params.get('error')
    if (error) {
      throw new AuthError(
        error === 'access_denied' ? 'Você recusou a permissão no Spotify.' : `O Spotify retornou um erro: ${error}`,
        error
      )
    }
    if (params.get('state') !== state) throw new AuthError('Resposta de login inválida (state não confere).', 'state')
    const code = params.get('code')
    if (!code) throw new AuthError('O Spotify não retornou o código de autorização.', 'no_code')

    const res = await this.tokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier
    })
    if (!res.refresh_token) throw new AuthError('O Spotify não retornou um refresh token.', 'no_refresh')
    this.forceDialog = false
    this.setTokens({
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      expiresAt: Date.now() + res.expires_in * 1000,
      scope: res.scope,
      clientId
    })
    parent?.focus()
  }

  /** Login dentro de uma janela do próprio app; o redirect para 127.0.0.1:5173 é interceptado. */
  private loginWithWindow(authorizeUrl: string, parent: BrowserWindow | null): Promise<string> {
    return new Promise((resolve, reject) => {
      const ses = session.fromPartition(AUTH_PARTITION)
      ses.setUserAgent(chromeUserAgent())

      const win = new BrowserWindow({
        width: 500,
        height: 760,
        parent: parent ?? undefined,
        modal: false,
        show: false,
        title: 'Entrar no Spotify',
        autoHideMenuBar: true,
        backgroundColor: '#121212',
        minimizable: false,
        maximizable: false,
        webPreferences: {
          partition: AUTH_PARTITION,
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false
        }
      })
      win.setMenu(null)

      let settled = false
      const finish = (fn: () => void): void => {
        if (settled) return
        settled = true
        ses.webRequest.onBeforeRequest(null)
        fn()
        if (!win.isDestroyed()) win.destroy()
      }

      this.cancelCurrentLogin = () => finish(() => reject(new AuthError('Login cancelado.', 'cancelled')))

      // Intercepta qualquer requisição para a Redirect URI (redirect HTTP ou navegação via JS).
      ses.webRequest.onBeforeRequest((details, callback) => {
        if (details.url.startsWith(REDIRECT_URI)) {
          callback({ cancel: true })
          finish(() => resolve(details.url))
          return
        }
        callback({})
      })

      // Links externos (termos, ajuda...) abrem no navegador padrão.
      win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://')) void shell.openExternal(url)
        return { action: 'deny' }
      })

      win.once('ready-to-show', () => win.show())
      win.on('closed', () => finish(() => reject(new AuthError('Login cancelado.', 'cancelled'))))
      win.loadURL(authorizeUrl).catch((err: Error) => {
        // ERR_ABORTED acontece quando cancelamos o redirect — é esperado.
        if (!settled && !/ERR_ABORTED/.test(err.message)) {
          const code = /ERR_[A-Z_]+/.exec(err.message)?.[0] ?? 'erro de rede'
          finish(() =>
            reject(new AuthError(`Não foi possível abrir a página de login do Spotify (${code}). Verifique sua conexão.`, 'load'))
          )
        }
      })
    })
  }

  /** Login pelo navegador padrão (útil para "Continuar com Google/Apple"). */
  private loginWithBrowser(authorizeUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let server: Server | null = null
      let timer: NodeJS.Timeout | null = null
      let settled = false
      const finish = (fn: () => void): void => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        server?.close()
        server?.closeAllConnections?.()
        fn()
      }
      this.cancelCurrentLogin = () => finish(() => reject(new AuthError('Login cancelado.', 'cancelled')))

      server = createServer((req, res) => {
        const url = new URL(req.url ?? '/', `http://127.0.0.1:${REDIRECT_PORT}`)
        if (url.pathname !== '/callback') {
          res.writeHead(404).end()
          return
        }
        const ok = url.searchParams.has('code')
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(callbackPage(ok))
        finish(() => resolve(`${REDIRECT_URI}${url.search}`))
      })
      server.on('error', (err: NodeJS.ErrnoException) => {
        finish(() =>
          reject(
            new AuthError(
              err.code === 'EADDRINUSE'
                ? `A porta ${REDIRECT_PORT} está em uso por outro programa. Feche-o ou use o login pela janela do app.`
                : `Falha ao aguardar o retorno do navegador: ${err.message}`,
              'server'
            )
          )
        )
      })
      server.listen(REDIRECT_PORT, '127.0.0.1', () => {
        void shell.openExternal(authorizeUrl)
      })
      timer = setTimeout(
        () => finish(() => reject(new AuthError('Tempo esgotado aguardando o login no navegador.', 'timeout'))),
        5 * 60 * 1000
      )
    })
  }

  private async tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
    let res: Response
    try {
      res = await net.fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body).toString()
      })
    } catch (err) {
      throw new AuthError(`Sem conexão com o Spotify: ${(err as Error).message}`, 'network')
    }
    const json = (await res.json().catch(() => ({}))) as TokenResponse
    if (!res.ok || json.error) {
      const code = json.error ?? `http_${res.status}`
      const desc = json.error_description ?? res.statusText
      let message = `Erro ao obter token (${code}): ${desc}`
      if (code === 'invalid_client') {
        message = 'Client ID inválido. Confira o valor copiado do Spotify Developer Dashboard.'
      } else if (/redirect/i.test(desc)) {
        message = `Redirect URI não cadastrada. Adicione exatamente ${REDIRECT_URI} no Dashboard do Spotify.`
      }
      throw new AuthError(message, code)
    }
    return json
  }

  /** Retorna um access token válido, renovando-o se faltar menos de 1 minuto para expirar. */
  async getAccessToken(): Promise<string> {
    const t = this.tokens
    if (!t || !this.state().loggedIn) throw new AuthError('Não autenticado.', 'not_logged_in')
    if (t.expiresAt - Date.now() > 60_000) return t.accessToken
    if (!this.refreshing) {
      this.refreshing = this.refresh(t).finally(() => {
        this.refreshing = null
      })
    }
    return this.refreshing
  }

  private async refresh(t: TokenSet): Promise<string> {
    try {
      const res = await this.tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: t.refreshToken,
        client_id: t.clientId
      })
      this.setTokens({
        accessToken: res.access_token,
        refreshToken: res.refresh_token ?? t.refreshToken,
        expiresAt: Date.now() + res.expires_in * 1000,
        scope: res.scope ?? t.scope,
        clientId: t.clientId
      })
      return res.access_token
    } catch (err) {
      const e = err as AuthError
      // Refresh token revogado/expirado: volta para a tela de login.
      if (e.code === 'invalid_grant' || e.code === 'invalid_client') this.setTokens(null)
      throw err
    }
  }
}

function callbackPage(ok: boolean): string {
  const title = ok ? 'Pronto! Você já pode voltar ao Sonora.' : 'O login não foi concluído.'
  const sub = ok ? 'Esta aba pode ser fechada.' : 'Volte ao Sonora e tente novamente.'
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Sonora</title>
<style>
:root{color-scheme:light dark}
body{margin:0;height:100vh;display:grid;place-items:center;font-family:"Segoe UI Variable Display","Segoe UI",system-ui,sans-serif;background:Canvas;color:CanvasText}
.card{padding:40px 48px;border-radius:8px;border:1px solid rgba(128,128,128,.25);text-align:center;animation:in .5s cubic-bezier(.1,.9,.2,1)}
h1{font-size:28px;font-weight:600;margin:0 0 8px}p{opacity:.7;margin:0;font-size:14px}
@keyframes in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
</style></head><body><div class="card"><h1>${title}</h1><p>${sub}</p></div>
<script>setTimeout(function(){window.close()},1500)</script></body></html>`
}

export const auth = new AuthManager()
