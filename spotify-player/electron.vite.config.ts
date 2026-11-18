import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Porta do servidor do renderer (dev e produção). A 5173 fica livre para o callback do OAuth. */
const RENDERER_PORT = 5180

/**
 * Injeta a Content-Security-Policy no index.html.
 * Em desenvolvimento o React Refresh precisa de script inline e de websocket do Vite.
 */
function cspPlugin(): Plugin {
  return {
    name: 'sonora-csp',
    transformIndexHtml(html, ctx) {
      const dev = Boolean(ctx.server)
      const csp = [
        "default-src 'self'",
        `script-src 'self' https://sdk.scdn.co${dev ? " 'unsafe-inline'" : ''}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "media-src 'self' blob: data: https:",
        `connect-src 'self' https: wss:${dev ? ' ws://127.0.0.1:* http://127.0.0.1:*' : ''}`,
        'frame-src https://sdk.scdn.co https://*.spotify.com',
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'"
      ].join('; ')
      return html.replace('%CSP%', csp)
    }
  }
}

export default defineConfig({
  main: {
    resolve: {
      alias: { '@shared': resolve(__dirname, 'src/shared') }
    },
    define: {
      __RENDERER_PORT__: JSON.stringify(RENDERER_PORT)
    }
  },
  preload: {
    resolve: {
      alias: { '@shared': resolve(__dirname, 'src/shared') }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        '@shared': resolve(__dirname, 'src/shared')
      }
    },
    server: {
      host: '127.0.0.1',
      port: RENDERER_PORT,
      strictPort: true
    },
    build: {
      target: 'chrome140',
      minify: true,
      cssCodeSplit: false,
      rolldownOptions: {
        input: resolve(__dirname, 'src/renderer/index.html')
      }
    },
    plugins: [react(), cspPlugin()]
  }
})
