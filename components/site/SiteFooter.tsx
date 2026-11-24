import Image from 'next/image'
import Link from 'next/link'
import { DISCORD_INVITE_URL, INSTAGRAM_URL, STREAM, TITLE_SPONSOR } from '@/lib/site'
import { BrandIcon } from './SocialIcon'

const iconLink = 'tap inline-flex items-center justify-center rounded-md text-body-dark hover:bg-graphite-2 hover:text-white'

export function SiteFooter() {
  return (
    <footer className="bg-graphite text-body-dark">
      <div className="page-x flex flex-col gap-10 pt-14 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3.5">
              <Image src="/brand/prism-mark-light.png" alt="" width={164} height={164} className="h-10 w-10" />
              <span className="font-heading text-[1.35rem] font-extrabold tracking-[0.25em] text-white">PRISM</span>
            </div>
            {/* The team's own accounts */}
            <ul className="-ml-3 flex items-center" aria-label="PRISM on social media">
              <li><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="PRISM on Instagram" className={iconLink}><BrandIcon name="instagram" className="h-5 w-5" /></a></li>
              {DISCORD_INVITE_URL && (
                <li><a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" aria-label="PRISM on Discord" className={iconLink}><BrandIcon name="discord" className="h-5 w-5" /></a></li>
              )}
              <li><a href={STREAM.url} target="_blank" rel="noopener noreferrer" aria-label={STREAM.label} title={STREAM.label} className={iconLink}><BrandIcon name="twitch" className="h-5 w-5" /></a></li>
            </ul>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 text-[15px] xs:grid-cols-3 sm:flex sm:gap-8">
            <Link href="/team" className="tap inline-flex items-center hover:text-white">Team</Link>
            <Link href="/team#results" className="tap inline-flex items-center hover:text-white">Results</Link>
            <Link href="/#partners" className="tap inline-flex items-center hover:text-white">Partners</Link>
            <Link href="/academy" className="tap inline-flex items-center hover:text-white">Academy</Link>
            <Link href="/community" className="tap inline-flex items-center hover:text-white">Community</Link>
          </nav>
        </div>
        <div className="flex flex-col gap-4 border-t border-graphite-3 pt-6 text-[13px] text-muted-dark sm:flex-row sm:items-center sm:justify-between">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>© {new Date().getFullYear()} PRISM Sim Sport</span>
            <a href={TITLE_SPONSOR.url} className="inline-flex items-center gap-2.5 hover:text-white">
              Sponsored by
              <Image src={TITLE_SPONSOR.logo.src} alt={TITLE_SPONSOR.name} width={TITLE_SPONSOR.logo.width} height={TITLE_SPONSOR.logo.height} className="h-5 w-auto" />
            </a>
          </span>
          <span>prismsimsport.app</span>
        </div>
      </div>
    </footer>
  )
}
