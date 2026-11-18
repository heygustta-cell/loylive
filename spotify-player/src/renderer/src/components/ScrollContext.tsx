import { createContext, useContext } from 'react'

/** Contêiner de rolagem da página atual (usado pelas listas virtualizadas). */
export const ScrollContext = createContext<HTMLElement | null>(null)
export const useScrollElement = (): HTMLElement | null => useContext(ScrollContext)
