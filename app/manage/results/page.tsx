import type { Metadata } from 'next'
import Link from 'next/link'
import ResultsEditor from '@/components/admin/ResultsEditor'
import { PageTitle } from '@/components/academy/ui'
import { getSeasons } from '@/lib/data'
import { SIMS, SIM_LABEL, isSim } from '@/lib/types'

export const metadata: Metadata = { title: 'Results' }

export default async function AdminResultsPage({ searchParams }: { searchParams: Promise<{ sim?: string }> }) {
  const { sim: requested } = await searchParams
  const sim = requested && isSim(requested) ? requested : 'lmu'
  const season = (await getSeasons(sim))[0] ?? new Date().getFullYear()

  return (
    <>
      <PageTitle title="Results" subtitle="Each sim’s results by season. Ticked rows are posted to the Discord results channel when you save." />
      <nav aria-label="Sim" className="flex gap-2">
        {SIMS.map((s) => (
          <Link
            key={s}
            href={s === 'lmu' ? '/manage/results' : `/manage/results?sim=${s}`}
            aria-current={s === sim ? 'page' : undefined}
            className="tap inline-flex items-center rounded-md border border-[#cbd1d9] bg-white px-4 text-sm font-semibold aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            {SIM_LABEL[s]}
          </Link>
        ))}
      </nav>
      <div className="rounded-xl border border-line bg-white">
        {/* Keyed so switching sims starts the editor fresh */}
        <ResultsEditor key={sim} sim={sim} season={season} />
      </div>
    </>
  )
}
