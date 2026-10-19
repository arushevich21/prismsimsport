'use client'

import { useActionState, useEffect, useRef } from 'react'
import { SubmitButton } from '@/components/academy/small'
import { saveSetup, saveVideo } from '@/lib/academy/actions'

const field = 'min-h-11 w-full rounded-md border border-[#cbd1d9] bg-white px-3'
const labelCls = 'flex flex-col gap-1 text-[13px] text-[#4a4f57]'
const primary = 'tap rounded-md bg-ink px-4 text-sm font-semibold text-white'

type Video = { id: string; youtube_id: string; title: string; track: string | null; car: string | null; category: string | null; description: string | null; sort_order: number | null }
type Setup = { id: string; title: string; track: string | null; car: string | null; setup_type: string | null; description: string | null; sort_order: number | null; filename: string | null }

function Status({ state, okText }: { state: { ok: boolean; error?: string } | null; okText: string }) {
  if (!state) return null
  return <span role="status" className={`text-sm ${state.ok ? 'text-ice-deep' : 'text-[#8a1c1c]'}`}>{state.ok ? okText : state.error}</span>
}

export function VideoForm({ video }: { video?: Video }) {
  const [state, action] = useActionState(saveVideo, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok && !video) ref.current?.reset()
  }, [state, video])
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      {video && <input type="hidden" name="id" value={video.id} />}
      <label className={`${labelCls} sm:col-span-2`}>YouTube link
        <input name="youtube_url" required defaultValue={video ? `https://www.youtube.com/watch?v=${video.youtube_id}` : ''} className={field} />
      </label>
      <label className={`${labelCls} sm:col-span-2`}>Title<input name="title" required defaultValue={video?.title} className={field} /></label>
      <label className={labelCls}>Category<input name="category" defaultValue={video?.category ?? ''} placeholder="e.g. Track guide" className={field} /></label>
      <label className={labelCls}>Car<input name="car" defaultValue={video?.car ?? ''} className={field} /></label>
      <label className={labelCls}>Track<input name="track" defaultValue={video?.track ?? ''} className={field} /></label>
      <label className={labelCls}>Order<input name="sort_order" type="number" defaultValue={video?.sort_order ?? ''} className={field} /></label>
      <label className={`${labelCls} sm:col-span-2`}>Description<textarea name="description" rows={2} defaultValue={video?.description ?? ''} className="rounded-md border border-[#cbd1d9] px-3 py-2" /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton className={primary}>{video ? 'Save video' : 'Add video'}</SubmitButton>
        <Status state={state} okText={video ? 'Saved.' : 'Added.'} />
      </div>
    </form>
  )
}

export function SetupForm({ setup }: { setup?: Setup }) {
  const [state, action] = useActionState(saveSetup, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok && !setup) ref.current?.reset()
  }, [state, setup])
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      {setup && <input type="hidden" name="id" value={setup.id} />}
      <label className={`${labelCls} sm:col-span-2`}>Setup file {setup?.filename && <span>(current: {setup.filename}; leave empty to keep it)</span>}
        <input name="file" type="file" required={!setup} className="min-h-11 rounded-md border border-[#cbd1d9] bg-white px-3 py-2" />
      </label>
      <label className={`${labelCls} sm:col-span-2`}>Title<input name="title" required defaultValue={setup?.title} className={field} /></label>
      <label className={labelCls}>Car<input name="car" defaultValue={setup?.car ?? ''} className={field} /></label>
      <label className={labelCls}>Track<input name="track" defaultValue={setup?.track ?? ''} className={field} /></label>
      <label className={labelCls}>Type
        <select name="setup_type" defaultValue={setup?.setup_type ?? ''} className={field}>
          <option value="">—</option>
          {['qualifying', 'race', 'wet', 'stable', 'pointy'].map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
      <label className={labelCls}>Order<input name="sort_order" type="number" defaultValue={setup?.sort_order ?? ''} className={field} /></label>
      <label className={`${labelCls} sm:col-span-2`}>Description<textarea name="description" rows={2} defaultValue={setup?.description ?? ''} className="rounded-md border border-[#cbd1d9] px-3 py-2" /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton className={primary} pendingText="Uploading…">{setup ? 'Save setup' : 'Add setup'}</SubmitButton>
        <Status state={state} okText={setup ? 'Saved.' : 'Added.'} />
      </div>
    </form>
  )
}
