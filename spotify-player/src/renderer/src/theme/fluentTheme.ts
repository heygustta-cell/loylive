import { createDarkTheme, createLightTheme, type BrandVariants, type Theme } from '@fluentui/react-components'
import { brandRamp } from './colors'

export const FONT_TEXT =
  '"Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", sans-serif'
export const FONT_DISPLAY =
  '"Segoe UI Variable Display", "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", sans-serif'

export interface AccentSet {
  /** Preenchimento de destaque (botão primário, slider, indicador da navegação). */
  fill: string
  /** Texto/ícones na cor de destaque. */
  text: string
  /** Texto sobre o preenchimento de destaque. */
  onFill: string
  brand: Record<number, string>
}

/**
 * Mapeia a rampa nas cores que o Windows 11 usa:
 *  - Tema escuro: AccentFill = "Light 2" (claro) com texto preto.
 *  - Tema claro:  AccentFill = "Dark 1" (escuro) com texto branco.
 */
export function accentSet(accent: string, dark: boolean): AccentSet {
  const brand = brandRamp(accent)
  return dark
    ? { fill: brand[130], text: brand[140], onFill: '#000000', brand }
    : { fill: brand[70], text: brand[60], onFill: '#ffffff', brand }
}

export function buildFluentTheme(accent: string, dark: boolean): Theme {
  const set = accentSet(accent, dark)
  const brand = set.brand as unknown as BrandVariants
  const base = dark ? createDarkTheme(brand) : createLightTheme(brand)
  const t: Theme = {
    ...base,
    fontFamilyBase: FONT_TEXT,
    colorBrandBackground: set.fill,
    colorBrandBackgroundHover: dark ? set.brand[120] : set.brand[80],
    colorBrandBackgroundPressed: dark ? set.brand[110] : set.brand[60],
    colorBrandBackgroundSelected: set.fill,
    colorCompoundBrandBackground: set.fill,
    colorCompoundBrandBackgroundHover: dark ? set.brand[120] : set.brand[80],
    colorCompoundBrandBackgroundPressed: dark ? set.brand[110] : set.brand[60],
    colorCompoundBrandStroke: set.fill,
    colorCompoundBrandStrokeHover: dark ? set.brand[120] : set.brand[80],
    colorCompoundBrandForeground1: set.text,
    colorBrandForeground1: set.text,
    colorBrandForegroundLink: set.text,
    colorBrandForegroundLinkHover: dark ? set.brand[150] : set.brand[50],
    colorNeutralForegroundOnBrand: set.onFill,
    colorBrandStroke1: set.fill,
    colorStrokeFocus2: dark ? '#ffffff' : '#000000'
  }
  // Fundos neutros transparentes deixam o Mica aparecer nos controles "subtle/transparent".
  if (dark) {
    Object.assign(t, {
      colorNeutralBackground1: '#2c2c2c',
      colorNeutralBackground1Hover: '#323232',
      colorNeutralBackground1Pressed: '#272727',
      colorSubtleBackgroundHover: 'rgba(255,255,255,0.0605)',
      colorSubtleBackgroundPressed: 'rgba(255,255,255,0.0419)',
      colorSubtleBackgroundSelected: 'rgba(255,255,255,0.0605)',
      colorTransparentBackgroundHover: 'rgba(255,255,255,0.0605)',
      colorTransparentBackgroundPressed: 'rgba(255,255,255,0.0419)'
    })
  } else {
    Object.assign(t, {
      colorNeutralBackground1: '#fbfbfb',
      colorSubtleBackgroundHover: 'rgba(0,0,0,0.0373)',
      colorSubtleBackgroundPressed: 'rgba(0,0,0,0.0241)',
      colorSubtleBackgroundSelected: 'rgba(0,0,0,0.0373)',
      colorTransparentBackgroundHover: 'rgba(0,0,0,0.0373)',
      colorTransparentBackgroundPressed: 'rgba(0,0,0,0.0241)'
    })
  }
  return t
}
