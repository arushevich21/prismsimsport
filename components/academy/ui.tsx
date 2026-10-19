import { TIER_LABEL, type Tier } from '@/lib/academy/constants'
import type { Person } from '@/lib/academy/queries'

// Layout pieces shared by the Academy and coach pages.

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-[1.65rem] leading-tight font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="text-[15px] text-[#4a4f57]">{subtitle}</p>}
      </div>
      {children && <div className="self-start sm:self-auto">{children}</div>}
    </div>
  )
}

export function Card({ title, action, children, className = '' }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-4 rounded-xl border border-line bg-white p-5 sm:p-7 ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

const TIER_CHIP: Record<Tier, string> = { student: 'bg-mist', driver: 'bg-[#d9e8fa]', elite: 'bg-[#ffe3cc]' }

export function TierChip({ tier }: { tier: Tier }) {
  return <span className={`rounded px-2 py-1 text-[11px] font-semibold tracking-wider uppercase ${TIER_CHIP[tier]}`}>{TIER_LABEL[tier]}</span>
}

export function StatusChip({ tone, children }: { tone: 'ice' | 'ember' | 'mist' | 'iris'; children: React.ReactNode }) {
  const bg = { ice: 'bg-[#d9e8fa]', ember: 'bg-[#ffe3cc]', mist: 'bg-mist', iris: 'bg-[#eeeffd]' }[tone]
  return <span className={`rounded px-2 py-1 text-[11px] font-semibold tracking-wider whitespace-nowrap uppercase ${bg}`}>{children}</span>
}

export function Avatar({ person, size = 'h-10 w-10' }: { person: Person | null | undefined; size?: string }) {
  const name = person?.display_name || person?.discord_username || '?'
  if (person?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element -- Discord avatar
    return <img src={person.avatar_url} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  }
  return (
    <span aria-hidden="true" className={`${size} flex shrink-0 items-center justify-center rounded-full bg-graphite text-sm font-semibold text-muted-dark`}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function formatWhen(iso: string, withTime = true) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } : {}),
  })
}

export const linkBtn =
  'tap inline-flex items-center justify-center rounded-md px-4 text-sm font-semibold'
