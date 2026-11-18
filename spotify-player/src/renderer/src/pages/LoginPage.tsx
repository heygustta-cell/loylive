import {
  Button,
  Field,
  Input,
  Link,
  MessageBar,
  MessageBarBody,
  Spinner
} from '@fluentui/react-components'
import {
  CopyRegular,
  GlobeRegular,
  HeadphonesRegular,
  OpenRegular,
  SparkleRegular,
  WindowRegular
} from '@fluentui/react-icons'
import { useState } from 'react'
import type { AuthState, LoginMode } from '@shared/types'
import { notify } from '@/lib/notify'
import { useSettings } from '@/state/settings'
import { AppLogo } from '@/components/AppLogo'
import { Aurora } from '@/components/Aurora'

export function LoginPage({ auth }: { auth: AuthState }) {
  const update = useSettings((s) => s.update)
  const [clientId, setClientId] = useState('')
  const [busy, setBusy] = useState<LoginMode | null>(null)
  const [error, setError] = useState<string | null>(null)

  const login = async (mode: LoginMode): Promise<void> => {
    setBusy(mode)
    setError(null)
    const res = await window.sonora.auth.login(mode)
    setBusy(null)
    if (!res.ok && res.error && res.error !== 'cancelled') setError(res.error)
  }

  const copy = (): void => {
    void navigator.clipboard.writeText(auth.redirectUri)
    notify('Redirect URI copiada', { intent: 'success', timeout: 1800 })
  }

  return (
    <>
      <Aurora />
      <div className="login-drag">
        <AppLogo size={18} />
        <span>Sonora</span>
      </div>
      <main className="login">
        <div className="login-card">
          <div className="login-logo-wrap">
            <AppLogo size={72} className="login-logo" />
          </div>
          <div>
            <h1 className="login-title display">Sua música, do jeito do Windows.</h1>
            <p className="text-2" style={{ margin: '8px 0 0' }}>
              O Sonora toca o seu Spotify direto no PC, com o visual e a fluidez do Windows 11.
            </p>
          </div>
          <div className="login-features">
            <span>
              <HeadphonesRegular /> Toca sem o app oficial
            </span>
            <span>
              <WindowRegular /> Mica e cores da capa
            </span>
            <span>
              <SparkleRegular /> Feito para 144 Hz
            </span>
          </div>

          {!auth.hasClientId ? (
            <>
              <ol className="login-steps">
                <li>
                  Abra o{' '}
                  <Link onClick={() => void window.sonora.openExternal('https://developer.spotify.com/dashboard')}>
                    Spotify Developer Dashboard <OpenRegular />
                  </Link>{' '}
                  e crie um app.
                </li>
                <li>
                  Em <b>Redirect URIs</b>, adicione <span className="code">{auth.redirectUri}</span>{' '}
                  <Button size="small" appearance="subtle" icon={<CopyRegular />} onClick={copy} aria-label="Copiar" />
                </li>
                <li>
                  Marque <b>Web API</b> e <b>Web Playback SDK</b> e salve.
                </li>
                <li>Copie o <b>Client ID</b> e cole abaixo.</li>
              </ol>
              <Field label="Client ID">
                <Input
                  className="win-input"
                  value={clientId}
                  onChange={(_, d) => setClientId(d.value)}
                  placeholder="ex.: 1a2b3c4d5e6f…"
                  onKeyDown={(e) => e.key === 'Enter' && clientId.trim() && update({ clientId: clientId.trim() })}
                />
              </Field>
              <Button appearance="primary" size="large" disabled={!clientId.trim()} onClick={() => update({ clientId: clientId.trim() })}>
                Continuar
              </Button>
            </>
          ) : (
            <div className="login-actions">
              <Button appearance="primary" size="large" disabled={busy !== null} onClick={() => void login('window')}>
                {busy === 'window' ? <Spinner size="tiny" /> : 'Entrar com o Spotify'}
              </Button>
              <Button appearance="subtle" icon={<GlobeRegular />} disabled={busy === 'browser'} onClick={() => void login('browser')}>
                {busy === 'browser' ? 'Aguardando o navegador…' : 'Entrar pelo navegador (Google, Apple, Facebook)'}
              </Button>
              <div className="copy-row t-caption text-3" style={{ marginTop: 6 }}>
                Redirect URI cadastrada: <span className="code">{auth.redirectUri}</span>
                <Button size="small" appearance="subtle" icon={<CopyRegular />} onClick={copy} aria-label="Copiar" />
              </div>
              {auth.clientIdSource === 'settings' && (
                <Button appearance="transparent" size="small" style={{ alignSelf: 'flex-start' }} onClick={() => update({ clientId: '' })}>
                  Trocar Client ID
                </Button>
              )}
            </div>
          )}

          {error && (
            <MessageBar intent="error" layout="multiline">
              <MessageBarBody>{error}</MessageBarBody>
            </MessageBar>
          )}
        </div>
      </main>
    </>
  )
}
