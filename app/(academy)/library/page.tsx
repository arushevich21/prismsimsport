import type { Metadata } from 'next'
import { YouTubeLite } from '@/components/academy/small'
import { PageTitle } from '@/components/academy/ui'
import { requireAcademyAccess } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Video library' }

type Video = { id: string; youtube_id: string; title: string; track: string | null; car: string | null; category: string | null; description: string | null }

const filterField = 'min-h-11 rounded-md border border-[#cbd1d9] bg-white px-3 text-[15px]'

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ car?: string; track?: string; category?: string }> }) {
  await requireAcademyAccess('/library')
  const filters = await searchParams
  const supabase = await createClient()
  const { data } = await supabase
    .from('videos')
    .select('id, youtube_id, title, track, car, category, description')
    .order('sort_order', { ascending: true, nullsFirst: false })
  const all = (data ?? []) as Video[]

  const options = (key: 'car' | 'track' | 'category') => [...new Set(all.map((v) => v[key]).filter((v): v is string => !!v))].sort()
  const videos = all.filter(
    (v) => (!filters.car || v.car === filters.car) && (!filters.track || v.track === filters.track) && (!filters.category || v.category === filters.category)
  )

  return (
    <>
      <PageTitle title="Video library" subtitle="Track guides and coaching breakdowns." />
      {all.length > 0 && (
        <form className="flex flex-wrap items-end gap-3" aria-label="Filter videos">
          {(['category', 'car', 'track'] as const).map((key) =>
            options(key).length > 0 ? (
              <label key={key} className="flex flex-col gap-1.5 text-[13px] text-[#4a4f57] capitalize">
                {key}
                <select name={key} defaultValue={filters[key] ?? ''} className={filterField}>
                  <option value="">All</option>
                  {options(key).map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
            ) : null
          )}
          <button type="submit" className="tap rounded-md bg-ink px-4 text-sm font-semibold text-white">Filter</button>
        </form>
      )}
      {videos.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-[15px] text-[#4a4f57]">{all.length ? 'No videos match those filters.' : 'Videos are on their way.'}</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {videos.map((v) => (
            <article key={v.id} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-3 sm:p-4">
              <YouTubeLite id={v.youtube_id} title={v.title} />
              <div className="flex flex-col gap-1 px-1 pb-1">
                <h2 className="font-semibold">{v.title}</h2>
                <span className="text-[13px] text-muted">{[v.category, v.car, v.track].filter(Boolean).join(' · ')}</span>
                {v.description && <p className="text-sm text-[#4a4f57]">{v.description}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
