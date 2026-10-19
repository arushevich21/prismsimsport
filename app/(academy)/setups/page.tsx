import type { Metadata } from 'next'
import { DownloadButton } from '@/components/academy/small'
import { PageTitle, StatusChip } from '@/components/academy/ui'
import { requireAcademyAccess } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Setups' }

type Setup = { id: string; title: string; track: string | null; car: string | null; setup_type: string | null; description: string | null; filename: string | null }

export default async function SetupsPage({ searchParams }: { searchParams: Promise<{ car?: string }> }) {
  await requireAcademyAccess('/setups')
  const { car } = await searchParams
  const supabase = await createClient()
  const { data } = await supabase
    .from('setups')
    .select('id, title, track, car, setup_type, description, filename')
    .order('sort_order', { ascending: true })
  const all = (data ?? []) as Setup[]
  const cars = [...new Set(all.map((s) => s.car).filter((c): c is string => !!c))].sort()
  const setups = car ? all.filter((s) => s.car === car) : all

  return (
    <>
      <PageTitle title="Setups" subtitle="Qualifying, race, wet and stable setups." />
      {cars.length > 1 && (
        <form className="flex flex-wrap items-end gap-3" aria-label="Filter setups">
          <label className="flex flex-col gap-1.5 text-[13px] text-[#4a4f57]">
            Car
            <select name="car" defaultValue={car ?? ''} className="min-h-11 rounded-md border border-[#cbd1d9] bg-white px-3 text-[15px]">
              <option value="">All cars</option>
              {cars.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <button type="submit" className="tap rounded-md bg-ink px-4 text-sm font-semibold text-white">Filter</button>
        </form>
      )}
      {setups.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-[15px] text-[#4a4f57]">No setups here yet.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {setups.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h2 className="font-semibold">{s.title}</h2>
                  <span className="text-[13px] text-muted">{[s.car, s.track].filter(Boolean).join(' · ')}</span>
                </div>
                {s.setup_type && <StatusChip tone="iris">{s.setup_type}</StatusChip>}
              </div>
              {s.description && <p className="text-sm text-[#4a4f57]">{s.description}</p>}
              <DownloadButton kind="setup" id={s.id} className="tap self-start rounded-md bg-ink px-4 text-sm font-semibold text-white">
                Download{s.filename ? ` ${s.filename}` : ''}
              </DownloadButton>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
