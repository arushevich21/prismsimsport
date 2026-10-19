import { classChip } from '@/lib/site'
import { SIM_SHORT, type Result } from '@/lib/types'

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }).toUpperCase()
}

const finish = (f: number | null) => (f ? `P${f}` : '—')

// Cards on phones, a table from tablet width up.
export function ResultsList({ results, showSim = false, empty }: { results: Result[]; showSim?: boolean; empty: string }) {
  if (results.length === 0) {
    return <p className="rounded-xl border border-line bg-white p-6 text-[15px] text-muted">{empty}</p>
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {results.map((r) => (
          <li key={r.id} className="flex items-start gap-4 rounded-xl border border-line bg-white p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-mono text-xs text-muted">
                {formatDate(r.raced_on)}{showSim && ` · ${SIM_SHORT[r.sim]}`}
              </span>
              <span className="font-semibold">{[r.championship, r.track].filter(Boolean).join(' · ') || 'Race'}</span>
              <span className="flex flex-wrap items-center gap-2 text-sm text-[#4a4f57]">
                {r.car}
                {r.class && <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wider text-ink uppercase ${classChip(r.class)}`}>{r.class}</span>}
              </span>
            </div>
            <span className="font-mono text-2xl font-semibold">{finish(r.finish)}</span>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr className="text-left font-mono text-xs tracking-[0.12em] text-muted uppercase">
              <th scope="col" className="px-6 py-4 font-normal">Date</th>
              <th scope="col" className="px-6 py-4 font-normal">Event</th>
              {showSim && <th scope="col" className="px-6 py-4 font-normal">Sim</th>}
              <th scope="col" className="px-6 py-4 font-normal">Car</th>
              <th scope="col" className="px-6 py-4 font-normal">Class</th>
              <th scope="col" className="px-6 py-4 text-right font-normal">Finish</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-6 py-4 font-mono whitespace-nowrap">{formatDate(r.raced_on)}</td>
                <td className="px-6 py-4 font-semibold">{[r.championship, r.track].filter(Boolean).join(' · ') || 'Race'}</td>
                {showSim && <td className="px-6 py-4">{SIM_SHORT[r.sim]}</td>}
                <td className="px-6 py-4">{r.car ?? '—'}</td>
                <td className="px-6 py-4">
                  {r.class ? <span className={`rounded px-2 py-1 text-xs font-semibold tracking-wider uppercase ${classChip(r.class)}`}>{r.class}</span> : '—'}
                </td>
                <td className="px-6 py-4 text-right font-mono font-semibold">{finish(r.finish)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
