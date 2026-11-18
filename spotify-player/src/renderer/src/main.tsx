import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { installNoiseTexture } from './lib/noise'
import { installReveal } from './lib/reveal'
import { queryClient } from './spotify/queries'
import { ThemeProvider } from './theme/ThemeProvider'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'

installNoiseTexture()
installReveal()

// Ganchos de depuração (somente em `npm run dev`).
if (import.meta.env.DEV) {
  void Promise.all([import('./spotify/player'), import('./lib/palette'), import('./state/nav'), import('./state/ui')]).then(
    ([player, palette, nav, ui]) => {
      ;(window as unknown as Record<string, unknown>).__sonora = { player, palette, nav, ui, queryClient }
    }
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
)
