import { siDiscord, siInstagram, siTiktok, siTwitch, siX, siYoutube } from 'simple-icons'
import { SOCIAL_LABEL, driverSocials, type Social, type SocialHandles } from '@/lib/socials'

// Brand marks from Simple Icons (CC0), drawn in the current text colour.
const ICONS = {
  instagram: siInstagram,
  twitch: siTwitch,
  youtube: siYoutube,
  tiktok: siTiktok,
  x: siX,
  discord: siDiscord,
} as const

export type IconName = keyof typeof ICONS

export function BrandIcon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={ICONS[name].path} />
    </svg>
  )
}

// A driver's accounts as a row of icon links. Nothing when none are set.
export function DriverSocials({ driver, name, className = '' }: { driver: Partial<SocialHandles>; name: string; className?: string }) {
  const links = driverSocials(driver)
  if (links.length === 0) return null
  return (
    <ul className={`flex items-center ${className}`} aria-label={`${name} on social media`}>
      {links.map((l) => (
        <li key={l.platform}>
          <a
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${name} on ${SOCIAL_LABEL[l.platform as Social]}`}
            className="tap inline-flex items-center justify-center text-muted-dark hover:text-white"
          >
            <BrandIcon name={l.platform} />
          </a>
        </li>
      ))}
    </ul>
  )
}
