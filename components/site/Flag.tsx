import * as Flags from 'country-flag-icons/react/3x2'

// Server component: the full flag set stays on the server, only the one SVG
// that's needed is sent to the browser.

const names = new Intl.DisplayNames(['en'], { type: 'region' })

export function countryName(code: string | null) {
  if (!code) return null
  try {
    return names.of(code) ?? code
  } catch {
    return code
  }
}

export function Flag({ code, className = 'h-3.5 w-auto' }: { code: string | null; className?: string }) {
  const Svg = code ? (Flags as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>)[code] : undefined
  if (!Svg) {
    return <span aria-hidden="true" className={`inline-block aspect-[3/2] rounded-[2px] border border-dashed border-[#9aa1ab] ${className}`} />
  }
  return <Svg role="img" aria-label={`${countryName(code)} flag`} className={`rounded-[2px] ${className}`} />
}
