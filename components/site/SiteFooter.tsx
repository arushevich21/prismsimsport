import Image from 'next/image'
import Link from 'next/link'
import { DISCORD_INVITE_URL, TITLE_SPONSOR } from '@/lib/site'

export function SiteFooter() {
  return (
    <footer className="bg-graphite text-body-dark">
      <div className="page-x flex flex-col gap-10 pt-14 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <Image src="/brand/prism-mark-light.png" alt="" width={164} height={164} className="h-10 w-10" />
            <span className="font-heading text-[1.35rem] font-extrabold tracking-[0.25em] text-white">PRISM</span>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 text-[15px] xs:grid-cols-3 sm:flex sm:gap-8">
            <Link href="/team" className="tap inline-flex items-center hover:text-white">Team</Link>
            <Link href="/community" className="tap inline-flex items-center hover:text-white">Community</Link>
            <Link href="/academy" className="tap inline-flex items-center hover:text-white">Academy</Link>
            {DISCORD_INVITE_URL && (
              <a href={DISCORD_INVITE_URL} className="tap inline-flex items-center hover:text-white">Discord</a>
            )}
          </nav>
        </div>
        <div className="flex flex-col gap-4 border-t border-graphite-3 pt-6 text-[13px] text-muted-dark sm:flex-row sm:items-center sm:justify-between">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>© {new Date().getFullYear()} PRISM Sim Sport</span>
            <span aria-hidden="true">·</span>
            <a href={TITLE_SPONSOR.url} className="inline-flex items-center gap-2.5 hover:text-white">
              Sponsored by
              <Image src={TITLE_SPONSOR.logo.src} alt={TITLE_SPONSOR.name} width={TITLE_SPONSOR.logo.width} height={TITLE_SPONSOR.logo.height} className="h-5 w-auto" />
            </a>
          </span>
          <span className="font-mono">prismsimsport.app</span>
        </div>
      </div>
    </footer>
  )
}
