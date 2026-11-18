/** Logotipo do Sonora (SVG inline, usa a cor de destaque do Windows). */
export function AppLogo({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="sonora-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent-fill)" />
          <stop offset="1" stopColor="var(--accent-base, var(--accent-fill))" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#sonora-g)" />
      <g fill="none" stroke="var(--accent-on-fill)" strokeWidth="5" strokeLinecap="round">
        <path d="M18 36v-8" />
        <path d="M26 44V20" />
        <path d="M34 40V24" />
        <path d="M42 46V18" />
        <path d="M50 34v-4" />
      </g>
    </svg>
  )
}
