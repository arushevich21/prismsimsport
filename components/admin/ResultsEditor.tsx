'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { refreshPublicPages } from '@/lib/admin/actions'
import { CLASSES, errorText, field, label, primaryBtn, smallBtn, uid } from '@/lib/admin/shared'
import { createClient } from '@/lib/supabase/client'
import { SIM_SHORT, type Sim } from '@/lib/types'

type Row = {
  key: string
  id: string | null
  raced_on: string
  championship: string
  track: string
  car: string
  class: string
  finish: string
}

async function fetchSeason(sim: Sim, season: number): Promise<{ rows: Row[]; best: string } | { error: string }> {
  const supabase = createClient()
  const [res, summary] = await Promise.all([
    supabase.from('results').select('*').eq('sim', sim).eq('season', season).order('raced_on', { ascending: false, nullsFirst: false }),
    supabase.from('season_summaries').select('best_championship').eq('sim', sim).eq('season', season).maybeSingle(),
  ])
  if (res.error) return { error: errorText(res.error) }
  return {
    rows: (res.data ?? []).map((r) => ({
      key: uid(),
      id: r.id as string,
      raced_on: r.raced_on ?? '',
      championship: r.championship ?? '',
      track: r.track ?? '',
      car: r.car ?? '',
      class: r.class ?? CLASSES[sim][0]!,
      finish: r.finish ? String(r.finish) : '',
    })),
    best: summary.data?.best_championship ? String(summary.data.best_championship) : '',
  }
}

export default function ResultsEditor({ sim, season: initialSeason }: { sim: Sim; season: number }) {
  const router = useRouter()
  const [season, setSeason] = useState(initialSeason)
  const [rows, setRows] = useState<Row[]>([])
  const [deleted, setDeleted] = useState<string[]>([])
  const [best, setBest] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const blankRow = useCallback((): Row => ({
    key: uid(), id: null, raced_on: '', championship: '', track: '', car: '', class: CLASSES[sim][0]!, finish: '',
  }), [sim])

  const apply = useCallback((result: Awaited<ReturnType<typeof fetchSeason>>) => {
    if ('error' in result) {
      setStatus({ kind: 'error', text: result.error })
      return
    }
    setRows(result.rows)
    setBest(result.best)
    setDeleted([])
    setDirty(false)
  }, [])

  const load = async (forSeason: number) => apply(await fetchSeason(sim, forSeason))

  useEffect(() => {
    let cancelled = false
    fetchSeason(sim, season).then((result) => {
      if (!cancelled) apply(result)
    })
    return () => {
      cancelled = true
    }
  }, [sim, season, apply])

  const update = (key: string, p: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)))
    setDirty(true)
  }

  function removeRow(row: Row) {
    setRows((rs) => rs.filter((r) => r.key !== row.key))
    if (row.id) setDeleted((d) => [...d, row.id!])
    setDirty(true)
  }

  const finishes = rows.map((r) => Number(r.finish)).filter((n) => n > 0)

  async function save() {
    setBusy(true)
    setStatus(null)
    const supabase = createClient()
    try {
      if (deleted.length) {
        const { error } = await supabase.from('results').delete().in('id', deleted)
        if (error) throw error
      }
      for (const r of rows) {
        const values = {
          sim,
          season,
          raced_on: r.raced_on || null,
          championship: r.championship.trim() || null,
          track: r.track.trim() || null,
          car: r.car.trim() || null,
          class: r.class || null,
          finish: Number(r.finish) > 0 ? Number(r.finish) : null,
        }
        const { error } = r.id
          ? await supabase.from('results').update(values).eq('id', r.id)
          : await supabase.from('results').insert(values)
        if (error) throw error
      }
      const bestValue = Number(best.replace(/^p/i, ''))
      const { error: sErr } = bestValue > 0
        ? await supabase.from('season_summaries').upsert({ sim, season, best_championship: bestValue })
        : await supabase.from('season_summaries').delete().eq('sim', sim).eq('season', season)
      if (sErr) throw sErr

      await refreshPublicPages()
      router.refresh()
      await load(season)
      setStatus({ kind: 'ok', text: 'Results saved.' })
    } catch (e) {
      setStatus({ kind: 'error', text: errorText(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <h3 className="mr-auto font-heading text-lg font-bold">{SIM_SHORT[sim]} results</h3>
        <label className={`${label} w-28`}>Season
          <input
            className={field}
            type="number"
            min={2000}
            max={2100}
            value={season}
            onChange={(e) => {
              if (dirty && !confirm('Discard unsaved changes for this season?')) return
              setSeason(Number(e.target.value) || initialSeason)
            }}
          />
        </label>
        <label className={`${label} w-36`}>Best championship
          <input className={field} value={best} onChange={(e) => { setBest(e.target.value); setDirty(true) }} placeholder="e.g. 2" inputMode="numeric" />
        </label>
      </div>

      <p className="text-sm text-muted">
        Races, wins and podiums are counted from these rows: {finishes.length} races · {finishes.filter((f) => f === 1).length} wins · {finishes.filter((f) => f <= 3).length} podiums.
      </p>

      <button
        type="button"
        className={`${smallBtn} self-start border-dashed border-iris-deep bg-[#f4f4fe] text-iris-deep`}
        onClick={() => { setRows((rs) => [blankRow(), ...rs]); setDirty(true) }}
      >
        + Add result
      </button>

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-2 gap-2 rounded-lg border border-line p-3 md:grid-cols-[9rem_1.4fr_1fr_1fr_7.5rem_5rem_auto] md:items-end md:border-0 md:border-b md:p-0 md:pb-3">
            <label className={label}>Date<input className={field} type="date" value={r.raced_on} onChange={(e) => update(r.key, { raced_on: e.target.value })} /></label>
            <label className={`${label} col-span-2 md:col-span-1`}>Championship · round<input className={field} value={r.championship} onChange={(e) => update(r.key, { championship: e.target.value })} /></label>
            <label className={label}>Track<input className={field} value={r.track} onChange={(e) => update(r.key, { track: e.target.value })} /></label>
            <label className={label}>Car<input className={field} value={r.car} onChange={(e) => update(r.key, { car: e.target.value })} /></label>
            <label className={label}>Class
              <select className={field} value={r.class} onChange={(e) => update(r.key, { class: e.target.value })}>
                {CLASSES[sim].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className={label}>Finish<input className={field} type="number" min={1} value={r.finish} onChange={(e) => update(r.key, { finish: e.target.value })} placeholder="P" /></label>
            <button type="button" aria-label="Remove this result" className={`${smallBtn} col-span-2 md:col-span-1`} onClick={() => removeRow(r)}>Remove</button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted">No results for {season} yet.</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <span className="text-sm text-muted">{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <button type="button" className={`${primaryBtn} ml-auto`} disabled={busy || !dirty} onClick={save}>{busy ? 'Saving…' : 'Save results'}</button>
      </div>
      {status && <p role="status" className={status.kind === 'ok' ? 'text-sm text-ice-deep' : 'text-sm text-[#8a1c1c]'}>{status.text}</p>}
    </div>
  )
}
