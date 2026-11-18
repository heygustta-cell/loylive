/** Utilitários de cor: conversões sRGB ↔ OKLab/OKLCH, rampa de cores e contraste. */

export type RGB = [number, number, number] // 0..255

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return [0, 103, 192]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number): string => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export const rgba = ([r, g, b]: RGB, a: number): string =>
  `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`

const toLinear = (c: number): number => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
const fromLinear = (v: number): number => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
  return c * 255
}

export function rgbToOklab([r, g, b]: RGB): [number, number, number] {
  const lr = toLinear(r)
  const lg = toLinear(g)
  const lb = toLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ]
}

/** Retorna [r,g,b] linear-convertido e um flag indicando se estava dentro do gamut sRGB. */
function oklabToRgbRaw(L: number, a: number, b: number): { rgb: RGB; inGamut: boolean } {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3)
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3)
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3)
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  const eps = 0.0005
  const inGamut = [lr, lg, lb].every((v) => v >= -eps && v <= 1 + eps)
  return { rgb: [fromLinear(Math.min(1, Math.max(0, lr))), fromLinear(Math.min(1, Math.max(0, lg))), fromLinear(Math.min(1, Math.max(0, lb)))], inGamut }
}

export function oklchToRgb(L: number, C: number, H: number): RGB {
  // Reduz o croma até caber no gamut sRGB (mantém matiz e luminosidade).
  let c = C
  for (let i = 0; i < 24; i++) {
    const { rgb, inGamut } = oklabToRgbRaw(L, c * Math.cos(H), c * Math.sin(H))
    if (inGamut) return rgb
    c *= 0.88
  }
  return oklabToRgbRaw(L, 0, 0).rgb
}

export function rgbToOklch(rgb: RGB): [number, number, number] {
  const [L, a, b] = rgbToOklab(rgb)
  return [L, Math.sqrt(a * a + b * b), Math.atan2(b, a)]
}

export function relativeLuminance([r, g, b]: RGB): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/** Ajusta a luminosidade OKLCH de uma cor para um valor alvo (0..1). */
export function withLightness(rgb: RGB, L: number, chromaScale = 1): RGB {
  const [, C, H] = rgbToOklch(rgb)
  return oklchToRgb(L, C * chromaScale, H)
}

/**
 * Gera as 16 variações de marca (10..160) que o Fluent UI v9 espera, a partir da cor de destaque
 * do Windows. O passo 80 fica igual à cor de destaque, como no tema padrão do Fluent.
 */
export function brandRamp(accentHex: string): Record<number, string> {
  const rgb = hexToRgb(accentHex)
  const [L0, C0, H] = rgbToOklch(rgb)
  const accentL = Math.min(0.7, Math.max(0.35, L0))
  const ramp: Record<number, string> = {}
  for (let i = 0; i < 16; i++) {
    const step = (i + 1) * 10
    let L: number
    if (i < 7) L = 0.13 + ((accentL - 0.13) * i) / 7
    else if (i === 7) L = accentL
    else L = accentL + ((0.97 - accentL) * (i - 7)) / 8
    const distance = Math.abs(i - 7) / 8
    const C = C0 * (1 - 0.55 * distance * distance)
    ramp[step] = i === 7 && L0 === accentL ? rgbToHex(rgb) : rgbToHex(oklchToRgb(L, C, H))
  }
  return ramp
}
