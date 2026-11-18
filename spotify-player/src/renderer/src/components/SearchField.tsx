import { SearchBox } from '@fluentui/react-components'
import { useEffect, useRef, useState } from 'react'
import { navigate, useNav } from '@/state/nav'

/** Referência global para Ctrl+F / Ctrl+L focarem a busca. */
export const searchFieldRef: { current: HTMLInputElement | null } = { current: null }

export function SearchField({ autoFocus, size = 'medium' }: { autoFocus?: boolean; size?: 'medium' | 'large' }) {
  const routeQ = useNav((s) => (s.current.name === 'search' ? s.current.q : null))
  const [value, setValue] = useState(routeQ ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (routeQ !== null && routeQ !== value) setValue(routeQ)
    if (routeQ === null) setValue('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeQ])

  useEffect(() => {
    if (!autoFocus) {
      searchFieldRef.current = inputRef.current
      return () => {
        if (searchFieldRef.current === inputRef.current) searchFieldRef.current = null
      }
    }
    inputRef.current?.focus()
    return undefined
  }, [autoFocus])

  const push = (q: string, immediate = false): void => {
    if (timer.current) clearTimeout(timer.current)
    const go = (): void => navigate({ name: 'search', q })
    if (immediate) go()
    else timer.current = setTimeout(go, 280)
  }

  return (
    <SearchBox
      className="searchbox"
      size={size}
      appearance="outline"
      placeholder="Buscar músicas, artistas, álbuns…"
      value={value}
      input={{ ref: inputRef }}
      onChange={(_, d) => {
        setValue(d.value)
        push(d.value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') push(value, true)
        if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
      }}
      onFocus={() => {
        if (routeQ === null && value) push(value, true)
      }}
    />
  )
}
