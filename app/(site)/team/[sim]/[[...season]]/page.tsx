import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TeamView } from '@/components/site/TeamView'
import { SIM_SHORT, isSim } from '@/lib/types'

export const revalidate = 300

type Params = { sim: string; season?: string[] }

export function generateStaticParams() {
  return [{ sim: 'lmu', season: [] }, { sim: 'acc', season: [] }]
}

function parse({ sim, season }: Params) {
  if (!isSim(sim)) return null
  if (!season || season.length === 0) return { sim, season: undefined }
  if (season.length !== 1 || !/^\d{4}$/.test(season[0]!)) return null
  return { sim, season: Number(season[0]) }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const parsed = parse(await params)
  if (!parsed) return {}
  return {
    title: `${SIM_SHORT[parsed.sim]} team${parsed.season ? ` · ${parsed.season}` : ''}`,
    description: `PRISM ${SIM_SHORT[parsed.sim]} lineup and results.`,
  }
}

export default async function SimTeamPage({ params }: { params: Promise<Params> }) {
  const parsed = parse(await params)
  if (!parsed) notFound()
  return <TeamView sim={parsed.sim} season={parsed.season} />
}
