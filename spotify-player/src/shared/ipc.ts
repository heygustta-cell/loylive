/** Nomes dos canais IPC (um único lugar para evitar erros de digitação). */
export const IPC = {
  systemInitial: 'system:initial',
  systemTheme: 'system:theme',

  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  settingsChanged: 'settings:changed',

  authState: 'auth:state',
  authLogin: 'auth:login',
  authLogout: 'auth:logout',
  authToken: 'auth:token',
  authChanged: 'auth:changed',

  drmStatus: 'drm:status',
  drmReady: 'drm:ready',
  drmOpenVmpLab: 'drm:open-vmp-lab',

  windowOverlayTone: 'window:overlay-tone',
  windowMaximized: 'window:maximized',
  windowFullscreen: 'window:fullscreen',
  windowToggleFullscreen: 'window:toggle-fullscreen',
  windowMini: 'window:mini',
  windowMiniChanged: 'window:mini-changed',

  openExternal: 'shell:open-external'
} as const
