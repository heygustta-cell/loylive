import { FluentProvider } from '@fluentui/react-components'
import { useLayoutEffect, useMemo, type ReactNode } from 'react'
import { useSettings } from '@/state/settings'
import { accentSet, buildFluentTheme } from './fluentTheme'
import { hexToRgb, rgba } from './colors'

/**
 * Aplica o tema claro/escuro e a cor de destaque do Windows automaticamente.
 * Além do tema Fluent, publica variáveis CSS (--accent-*) usadas pelos componentes próprios.
 */
export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const dark = useSettings((s) => s.system.dark)
  const accent = useSettings((s) => s.system.accent)
  const materialSupported = useSettings((s) => s.system.materialSupported)
  const material = useSettings((s) => s.settings.material)
  const reduceMotion = useSettings((s) => s.settings.reduceMotion)

  const theme = useMemo(() => buildFluentTheme(accent, dark), [accent, dark])

  useLayoutEffect(() => {
    const root = document.documentElement
    const set = accentSet(accent, dark)
    root.dataset.theme = dark ? 'dark' : 'light'
    root.dataset.material = materialSupported && material !== 'none' ? 'on' : 'off'
    root.dataset.platform = window.sonora.platform
    root.dataset.reduceMotion = reduceMotion ? 'on' : 'off'
    root.style.colorScheme = dark ? 'dark' : 'light'
    root.style.setProperty('--accent-fill', set.fill)
    root.style.setProperty('--accent-text', set.text)
    root.style.setProperty('--accent-on-fill', set.onFill)
    root.style.setProperty('--accent-fill-hover', rgba(hexToRgb(set.fill), 0.9))
    root.style.setProperty('--accent-fill-pressed', rgba(hexToRgb(set.fill), 0.8))
    root.style.setProperty('--accent-soft', rgba(hexToRgb(set.fill), dark ? 0.16 : 0.12))
    root.style.setProperty('--accent-base', accent)
  }, [accent, dark, materialSupported, material, reduceMotion])

  return (
    <FluentProvider theme={theme} className="fluent-root" applyStylesToPortals>
      {children}
    </FluentProvider>
  )
}
