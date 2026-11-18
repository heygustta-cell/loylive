/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  /** Client ID do Spotify definido no arquivo .env (opcional). */
  readonly MAIN_VITE_SPOTIFY_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Porta do servidor do renderer, definida em electron.vite.config.ts. */
declare const __RENDERER_PORT__: number
