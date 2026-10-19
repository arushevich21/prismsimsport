import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SubmitButton } from '@/components/academy/small'
import { Card, PageTitle } from '@/components/academy/ui'
import { deleteSetup, deleteVideo } from '@/lib/academy/actions'
import { requireStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { SetupForm, VideoForm } from './forms'

export const metadata: Metadata = { title: 'Library & setups' }

const del = 'tap rounded-md border border-[#e3b4b4] bg-white px-3 text-sm font-semibold text-[#8a1c1c]'

export default async function CoachLibraryPage() {
  const viewer = await requireStaff('/coach/library')
  if (viewer.role !== 'admin') redirect('/coach')

  const supabase = await createClient()
  const [{ data: videos }, { data: setups }] = await Promise.all([
    supabase.from('videos').select('id, youtube_id, title, track, car, category, description, sort_order').order('sort_order', { ascending: true, nullsFirst: false }),
    supabase.from('setups').select('id, title, track, car, setup_type, description, sort_order, filename').order('sort_order', { ascending: true }),
  ])

  return (
    <>
      <PageTitle title="Library & setups" subtitle="What Academy students see on the Video library and Setups pages." />

      <Card title="Add a video"><VideoForm /></Card>
      <Card title={`Videos (${videos?.length ?? 0})`}>
        <ul className="flex flex-col">
          {(videos ?? []).map((v) => (
            <li key={v.id} className="border-b border-mist py-2 last:border-0">
              <details>
                <summary className="tap flex cursor-pointer items-center gap-3">
                  <span className="flex-1 font-medium">{v.title}</span>
                  <span className="hidden text-sm text-muted sm:inline">{[v.category, v.car, v.track].filter(Boolean).join(' · ')}</span>
                </summary>
                <div className="flex flex-col gap-3 py-3">
                  <VideoForm video={v} />
                  <form action={deleteVideo}>
                    <input type="hidden" name="id" value={v.id} />
                    <SubmitButton className={del} pendingText="Deleting…">Delete video</SubmitButton>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Add a setup"><SetupForm /></Card>
      <Card title={`Setups (${setups?.length ?? 0})`}>
        <ul className="flex flex-col">
          {(setups ?? []).map((s) => (
            <li key={s.id} className="border-b border-mist py-2 last:border-0">
              <details>
                <summary className="tap flex cursor-pointer items-center gap-3">
                  <span className="flex-1 font-medium">{s.title}</span>
                  <span className="hidden text-sm text-muted sm:inline">{[s.car, s.track, s.setup_type].filter(Boolean).join(' · ')}</span>
                </summary>
                <div className="flex flex-col gap-3 py-3">
                  <SetupForm setup={s} />
                  <form action={deleteSetup}>
                    <input type="hidden" name="id" value={s.id} />
                    <SubmitButton className={del} pendingText="Deleting…">Delete setup</SubmitButton>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
