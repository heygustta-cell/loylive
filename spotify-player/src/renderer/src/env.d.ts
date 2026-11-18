/// <reference types="vite/client" />
import type { SonoraApi } from '@shared/api'

declare global {
  interface Window {
    sonora: SonoraApi
  }
}

export {}
