import type { Metadata } from 'next'
import { DownloadButton } from '@/components/academy/small'
import { TelemetryUploader } from '@/components/academy/TelemetryUploader'
import { Card, PageTitle, StatusChip } from '@/components/academy/ui'
import { getTelemetryFor } from '@/lib/academy/queries'
import { requireAcademyAccess } from '@/lib/auth'

export const metadata: Metadata = { title: 'Telemetry' }

export default async function TelemetryPage() {
  const viewer = await requireAcademyAccess('/telemetry')
  const uploads = await getTelemetryFor(viewer.user.id)

  return (
    <>
      <PageTitle title="Telemetry review" subtitle="Send your laps to your coach. Files are private to you and your coach." />
      <Card>
        <TelemetryUploader userId={viewer.user.id} />
      </Card>
      <Card title="Your uploads">
        {uploads.length === 0 ? (
          <p className="text-[15px] text-[#4a4f57]">Nothing uploaded yet.</p>
        ) : (
          <ul className="flex flex-col">
            {uploads.map((u) => (
              <li key={u.id} className="flex flex-col gap-3 border-b border-mist py-4 first:pt-0 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="min-w-0 flex-1 font-mono text-sm break-all">{u.filename}</span>
                  <span className="text-[13px] text-muted">{new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  {u.reviewed ? <StatusChip tone="ice">Reviewed</StatusChip> : <StatusChip tone="ember">Waiting for review</StatusChip>}
                  <DownloadButton kind="telemetry" id={String(u.id)} className="tap rounded-md border border-[#cbd1d9] px-3 text-sm font-semibold">Download</DownloadButton>
                </div>
                {u.note && <p className="text-sm text-[#4a4f57]"><span className="font-semibold text-ink">Your note:</span> {u.note}</p>}
                {u.feedback && (
                  <div className="rounded-lg bg-mist p-4 text-[15px]">
                    <span className="font-semibold">Coach feedback</span>
                    <p className="mt-1 whitespace-pre-wrap text-[#33373e]">{u.feedback}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
