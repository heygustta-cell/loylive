import {
  Avatar,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Tooltip
} from '@fluentui/react-components'
import {
  AlbumRegular,
  AlbumFilled,
  bundleIcon,
  HeartRegular,
  HeartFilled,
  HomeRegular,
  HomeFilled,
  LibraryRegular,
  LibraryFilled,
  NavigationRegular,
  SearchRegular,
  SearchFilled,
  SettingsRegular,
  SettingsFilled,
  SignOutRegular,
  TextBulletListLtrRegular,
  TextBulletListLtrFilled
} from '@fluentui/react-icons'
import { memo, useLayoutEffect, useRef, type ReactNode } from 'react'
import { navigate, routeKey, useNav, type Route } from '@/state/nav'
import { useSettings } from '@/state/settings'
import { useAllMyPlaylists, useMe } from '@/spotify/queries'
import { pickImage } from '@/spotify/api'
import { Artwork } from './Artwork'
import { SearchField } from './SearchField'
import { beginNavFlip } from '@/lib/navFlip'

const Home = bundleIcon(HomeFilled, HomeRegular)
const Search = bundleIcon(SearchFilled, SearchRegular)
const Heart = bundleIcon(HeartFilled, HeartRegular)
const Album = bundleIcon(AlbumFilled, AlbumRegular)
const Library = bundleIcon(LibraryFilled, LibraryRegular)
const Queue = bundleIcon(TextBulletListLtrFilled, TextBulletListLtrRegular)
const Settings = bundleIcon(SettingsFilled, SettingsRegular)

interface ItemProps {
  id: string
  route: Route
  label: string
  icon: ReactNode
  active: boolean
  compact: boolean
  register: (id: string, el: HTMLButtonElement | null) => void
}

const NavItem = memo(function NavItem({ id, route, label, icon, active, compact, register }: ItemProps) {
  const button = (
    <button
      ref={(el) => register(id, el)}
      className="nav-item reveal"
      data-active={active ? 'true' : 'false'}
      aria-current={active ? 'page' : undefined}
      onClick={() => navigate(route)}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </button>
  )
  return compact ? (
    <Tooltip content={label} relationship="label" positioning="after" withArrow>
      {button}
    </Tooltip>
  ) : (
    button
  )
})

/** Calcula a posição do indicador e anima o "esticar e encolher" do Fluent (só transform). */
function useIndicator(activeId: string | null) {
  const items = useRef(new Map<string, HTMLButtonElement>())
  const indicator = useRef<HTMLSpanElement>(null)
  const lastY = useRef<number | null>(null)
  const register = useRef((id: string, el: HTMLButtonElement | null) => {
    if (el) items.current.set(id, el)
    else items.current.delete(id)
  }).current

  useLayoutEffect(() => {
    const ind = indicator.current
    if (!ind) return
    const el = activeId ? items.current.get(activeId) : undefined
    if (!el) {
      ind.dataset.hidden = 'true'
      lastY.current = null
      return
    }
    const y = el.offsetTop + (el.offsetHeight - 16) / 2
    ind.dataset.hidden = 'false'
    const from = lastY.current
    ind.style.setProperty('--y', `${y}px`)
    if (from !== null && from !== y && !document.documentElement.dataset.reduceMotion?.includes('on')) {
      const dist = Math.abs(y - from)
      const stretch = Math.min(3, 1 + dist / 60)
      ind.animate(
        [
          { transform: `translate3d(0, ${from}px, 0) scaleY(1)` },
          { transform: `translate3d(0, ${(from + y) / 2}px, 0) scaleY(${stretch})`, offset: 0.45 },
          { transform: `translate3d(0, ${y}px, 0) scaleY(1)` }
        ],
        { duration: 360, easing: 'cubic-bezier(0.55, 0.55, 0, 1)' }
      )
    }
    lastY.current = y
  })

  return { indicator, register }
}

function activeIdFor(route: Route): string | null {
  switch (route.name) {
    case 'playlist':
      return `pl:${route.id}`
    case 'album':
    case 'artist':
      return null
    default:
      return route.name
  }
}

export function NavPane({ compact }: { compact: boolean }) {
  const current = useNav((s) => s.current)
  const collapsed = useSettings((s) => s.settings.navCollapsed)
  const update = useSettings((s) => s.update)
  const { playlists } = useAllMyPlaylists()
  const { data: me } = useMe()
  const activeId = activeIdFor(current)
  const main = useIndicator(activeId)
  const footer = useIndicator(activeId === 'settings' ? 'settings' : null)

  const items: Array<{ id: string; route: Route; label: string; icon: ReactNode }> = [
    { id: 'home', route: { name: 'home' }, label: 'Início', icon: <Home /> },
    { id: 'search', route: { name: 'search', q: '' }, label: 'Buscar', icon: <Search /> },
    { id: 'liked', route: { name: 'liked' }, label: 'Músicas curtidas', icon: <Heart /> },
    { id: 'albums', route: { name: 'albums' }, label: 'Álbuns', icon: <Album /> },
    { id: 'playlists', route: { name: 'playlists' }, label: 'Playlists', icon: <Library /> },
    { id: 'queue', route: { name: 'queue' }, label: 'Fila', icon: <Queue /> }
  ]

  const toggle = (): void => {
    beginNavFlip()
    update({ navCollapsed: !collapsed })
  }

  const avatar = pickImage(me?.images, 24)

  return (
    <nav className="nav" aria-label="Navegação">
      <div className="nav-top">
        <Tooltip content={compact ? 'Expandir navegação' : 'Recolher navegação'} relationship="label" withArrow>
          <button className="nav-item" style={{ width: 40, paddingLeft: 10 }} onClick={toggle} aria-label="Menu">
            <span className="nav-icon">
              <NavigationRegular />
            </span>
          </button>
        </Tooltip>
        <div className="nav-search">
          <SearchField />
        </div>
      </div>

      <div className="nav-scroll">
        <div className="nav-list">
          <span ref={main.indicator} className="nav-indicator" data-hidden="true" />
          {items.map((it) => (
            <NavItem key={it.id} {...it} active={activeId === it.id} compact={compact} register={main.register} />
          ))}
          {playlists.length > 0 && (
            <>
              <div className="nav-section-title">Suas playlists</div>
              <div className="nav-divider-compact" />
              {playlists.map((p) => {
                const id = `pl:${p.id}`
                return (
                  <NavItem
                    key={id}
                    id={id}
                    route={{ name: 'playlist', id: p.id }}
                    label={p.name}
                    icon={<Artwork images={p.images} size={22} className="nav-art" />}
                    active={activeId === id}
                    compact={compact}
                    register={main.register}
                  />
                )
              })}
            </>
          )}
        </div>
      </div>

      <div className="nav-footer">
        <div className="nav-list">
          <span ref={footer.indicator} className="nav-indicator" data-hidden="true" />
          <Menu positioning={{ position: 'after', align: 'end' }}>
            <MenuTrigger disableButtonEnhancement>
              <button className="nav-item reveal" aria-label="Conta">
                <span className="nav-icon">
                  <span className="nav-avatar">
                    {avatar ? (
                      <img className="avatar-img" src={avatar} alt="" />
                    ) : (
                      <Avatar size={24} name={me?.display_name ?? undefined} />
                    )}
                  </span>
                </span>
                <span className="nav-label">{me?.display_name ?? 'Minha conta'}</span>
              </button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<SignOutRegular />} onClick={() => void window.sonora.auth.logout()}>
                  Sair da conta
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <NavItem
            id="settings"
            route={{ name: 'settings' }}
            label="Configurações"
            icon={<Settings />}
            active={activeId === 'settings'}
            compact={compact}
            register={footer.register}
          />
        </div>
      </div>
    </nav>
  )
}

export { routeKey }
