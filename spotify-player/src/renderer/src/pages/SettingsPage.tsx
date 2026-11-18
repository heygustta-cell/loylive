import {
  Button,
  Dropdown,
  Input,
  Option,
  Slider as FluentSlider,
  Switch
} from '@fluentui/react-components'
import {
  ArrowSyncRegular,
  CopyRegular,
  DarkThemeRegular,
  DesktopRegular,
  KeyRegular,
  OpenRegular,
  PaintBrushRegular,
  PersonRegular,
  ShieldCheckmarkRegular,
  SignOutRegular,
  SparkleRegular,
  SpeakerSettingsRegular,
  WindowRegular
} from '@fluentui/react-icons'
import { useEffect, useState, type ReactNode } from 'react'
import type { AuthState, DrmStatus, ThemeMode, WindowMaterial } from '@shared/types'
import { notify } from '@/lib/notify'
import { useSettings } from '@/state/settings'
import { DEVICE_NAME, transferHere, usePlayer, widevineAvailable } from '@/spotify/player'
import { useMe } from '@/spotify/queries'

function Setting({ icon, title, desc, children, stack }: { icon: ReactNode; title: string; desc?: ReactNode; children?: ReactNode; stack?: boolean }) {
  return (
    <div className={`setting${stack ? ' stack' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
        <span className="setting-icon">{icon}</span>
        <div className="setting-text">
          <span>{title}</span>
          {desc && <span className="setting-desc">{desc}</span>}
        </div>
        {!stack && <div className="setting-control">{children}</div>}
      </div>
      {stack && <div style={{ paddingLeft: 40 }}>{children}</div>}
    </div>
  )
}

const THEMES: Record<ThemeMode, string> = { system: 'Usar configuração do Windows', light: 'Claro', dark: 'Escuro' }
const MATERIALS: Record<WindowMaterial, string> = { mica: 'Mica', tabbed: 'Mica Alt', acrylic: 'Acrílico', none: 'Nenhum (sólido)' }

export function SettingsPage() {
  const settings = useSettings((s) => s.settings)
  const system = useSettings((s) => s.system)
  const update = useSettings((s) => s.update)
  const { data: me } = useMe()
  const player = usePlayer()
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [drm, setDrm] = useState<DrmStatus | null>(null)
  const [eme, setEme] = useState<boolean | null>(null)
  const [clientId, setClientId] = useState(settings.clientId)

  useEffect(() => {
    void window.sonora.auth.state().then(setAuth)
    void window.sonora.drm.status().then(setDrm)
    void widevineAvailable().then(setEme)
  }, [])

  const copy = (text: string): void => {
    void navigator.clipboard.writeText(text)
    notify('Copiado', { intent: 'success', timeout: 1800 })
  }
  const widevine = drm?.components ? Object.values(drm.components).find((c) => /widevine/i.test(c.title ?? '')) : undefined

  return (
    <div className="settings">
      <h1 className="t-title-large page-title">Configurações</h1>

      <h3>Aparência</h3>
      <div className="settings-group stagger">
        <Setting icon={<DarkThemeRegular />} title="Tema" desc="Por padrão o app segue o tema claro/escuro e a cor de destaque do Windows.">
          <Dropdown
            value={THEMES[settings.theme]}
            selectedOptions={[settings.theme]}
            onOptionSelect={(_, d) => update({ theme: d.optionValue as ThemeMode })}
            style={{ minWidth: 240 }}
          >
            {(Object.keys(THEMES) as ThemeMode[]).map((k) => (
              <Option key={k} value={k}>
                {THEMES[k]}
              </Option>
            ))}
          </Dropdown>
        </Setting>
        <Setting
          icon={<WindowRegular />}
          title="Material da janela"
          desc={system.materialSupported ? 'Efeito translúcido nativo do Windows 11 por trás do app.' : 'Requer Windows 11 22H2 ou superior.'}
        >
          <Dropdown
            disabled={!system.materialSupported}
            value={MATERIALS[settings.material]}
            selectedOptions={[settings.material]}
            onOptionSelect={(_, d) => update({ material: d.optionValue as WindowMaterial })}
            style={{ minWidth: 200 }}
          >
            {(Object.keys(MATERIALS) as WindowMaterial[]).map((k) => (
              <Option key={k} value={k}>
                {MATERIALS[k]}
              </Option>
            ))}
          </Dropdown>
        </Setting>
        <Setting icon={<PaintBrushRegular />} title="Cores da capa" desc="Intensidade da camada tingida com as cores da música atual.">
          <FluentSlider
            min={0}
            max={100}
            value={Math.round(settings.tintStrength * 100)}
            onChange={(_, d) => update({ tintStrength: d.value / 100 })}
            style={{ width: 220 }}
          />
        </Setting>
        <Setting icon={<SparkleRegular />} title="Reduzir animações" desc="Desliga transições e efeitos de movimento.">
          <Switch checked={settings.reduceMotion} onChange={(_, d) => update({ reduceMotion: d.checked })} />
        </Setting>
      </div>

      <h3>Reprodução</h3>
      <div className="settings-group stagger">
        <Setting
          icon={<DesktopRegular />}
          title="Transferir a reprodução ao abrir"
          desc={`Ao abrir, o "${DEVICE_NAME}" vira o dispositivo ativo da sua conta.`}
        >
          <Button onClick={() => void transferHere(false)}>Transferir agora</Button>
          <Switch checked={settings.autoTransfer} onChange={(_, d) => update({ autoTransfer: d.checked })} />
        </Setting>
        <Setting
          icon={<SpeakerSettingsRegular />}
          title="Controles de mídia do Windows"
          desc="Teclas de mídia e o painel de mídia do Windows (vale após recarregar)."
        >
          <Switch checked={settings.mediaSession} onChange={(_, d) => update({ mediaSession: d.checked })} />
        </Setting>
      </div>

      <h3>Conta do Spotify</h3>
      <div className="settings-group stagger">
        <Setting icon={<PersonRegular />} title={me?.display_name ?? 'Conectado'} desc={me ? `ID: ${me.id}` : undefined}>
          <Button icon={<SignOutRegular />} onClick={() => void window.sonora.auth.logout()}>
            Sair
          </Button>
        </Setting>
        <Setting
          icon={<KeyRegular />}
          title="Client ID"
          stack
          desc={
            auth?.clientIdSource === 'env'
              ? 'Em uso: valor do arquivo .env (MAIN_VITE_SPOTIFY_CLIENT_ID). Preencha abaixo para substituir.'
              : 'Do app criado no Spotify Developer Dashboard.'
          }
        >
          <div className="row-gap" style={{ marginTop: 8 }}>
            <Input
              className="win-input"
              value={clientId}
              onChange={(_, d) => setClientId(d.value)}
              placeholder="Cole aqui o Client ID"
              style={{ width: 380 }}
            />
            <Button appearance="primary" disabled={clientId.trim() === settings.clientId} onClick={() => update({ clientId: clientId.trim() })}>
              Salvar
            </Button>
          </div>
          <div className="row-gap t-caption text-2" style={{ marginTop: 10 }}>
            Redirect URI: <span className="code">{auth?.redirectUri}</span>
            <Button size="small" appearance="subtle" icon={<CopyRegular />} onClick={() => auth && copy(auth.redirectUri)} />
          </div>
        </Setting>
      </div>

      <h3>DRM e diagnóstico</h3>
      <div className="settings-group stagger">
        <Setting
          icon={<ShieldCheckmarkRegular />}
          title="Widevine (castLabs ECS)"
          stack
          desc="O Spotify exige Widevine. No Windows, o Electron também precisa da assinatura VMP (veja o README)."
        >
          <dl className="kv" style={{ marginTop: 10 }}>
            <dt>Componente</dt>
            <dd>{drm ? (drm.ready ? 'Pronto' : (drm.error ?? 'Preparando…')) : '…'}</dd>
            <dt>Versão do CDM</dt>
            <dd>{widevine?.version ?? '—'}</dd>
            <dt>EME com.widevine.alpha</dt>
            <dd>{eme === null ? '…' : eme ? 'Disponível' : 'Indisponível'}</dd>
            <dt>Player</dt>
            <dd>
              {player.status === 'ready' ? `Conectado (${player.active ? 'ativo' : 'inativo'})` : player.status}
              {player.error ? ` — ${player.error.message}` : ''}
            </dd>
            <dt>Device ID</dt>
            <dd>{player.deviceId ?? '—'}</dd>
            <dt>Electron / Chromium</dt>
            <dd>
              {drm?.electron} / {drm?.chrome}
            </dd>
            <dt>Execução</dt>
            <dd>{drm ? (drm.packaged ? 'App instalado' : 'Desenvolvimento (npm run dev)') : '…'}</dd>
          </dl>
          <div className="row-gap" style={{ marginTop: 12 }}>
            <Button icon={<OpenRegular />} onClick={() => void window.sonora.drm.openVmpLab()}>
              Testar VMP (castLabs VMP Lab)
            </Button>
            <Button icon={<ArrowSyncRegular />} onClick={() => window.location.reload()}>
              Recarregar player
            </Button>
          </div>
        </Setting>
      </div>

      <p className="t-caption text-3" style={{ marginTop: 28 }}>
        Sonora — player de Spotify não oficial. Requer Spotify Premium. Atalhos: Espaço (tocar/pausar), Ctrl+←/→ (faixa),
        Ctrl+↑/↓ (volume), Ctrl+F (buscar), Alt+← (voltar), F12 (DevTools).
      </p>
    </div>
  )
}
