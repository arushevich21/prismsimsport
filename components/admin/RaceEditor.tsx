'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { refreshPublicPages, removeRaceFromDiscord, syncRaceToDiscord } from '@/lib/admin/actions'
import {
  CLASSES, dangerBtn, errorText, field, getCountryOptions, isoToLocalInput, label, localInputToIso, primaryBtn, smallBtn, uid,
} from '@/lib/admin/shared'
import { createClient } from '@/lib/supabase/client'
import { SIM_SHORT, lineupBadge, type Sim } from '@/lib/types'
import { useRoster, type AdminDriver } from './useRoster'

type RaceRow = {
  id: string
  event_name: string | null
  series: string | null
  track: string | null
  race_length: string | null
  starts_at: string | null
  stream_url: string | null
  published: boolean
  race_cars: { car_name: string | null; class: string | null; sort_order: number; race_car_drivers: { driver_id: string; sort_order: number }[] }[]
}

type CarDraft = { key: string; car_name: string; cls: string; driverIds: string[] }
type Form = { event_name: string; series: string; track: string; race_length: string; starts: string; stream_url: string; published: boolean }

const BLANK: Form = { event_name: '', series: '', track: '', race_length: '', starts: '', stream_url: '', published: true }
const GRACE_MS = 4 * 60 * 60 * 1000
async function fetchRaces(sim: Sim): Promise<{ rows: RaceRow[] } | { error: string }> {
  const grace = new Date(Date.now() - GRACE_MS).toISOString()
  const { data, error } = await createClient()
    .from('races')
    .select('id, event_name, series, track, race_length, starts_at, stream_url, published, race_cars ( car_name, class, sort_order, race_car_drivers ( driver_id, sort_order ) )')
    .eq('sim', sim)
    .or(`starts_at.gte.${grace},starts_at.is.null`)
    .order('starts_at', { ascending: true, nullsFirst: false })
  if (error) return { error: errorText(error) }
  return { rows: (data ?? []) as RaceRow[] }
}

const newCar = (sim: Sim): CarDraft => ({ key: uid(), car_name: '', cls: CLASSES[sim][0]!, driverIds: [] })

export default function RaceEditor({ sim: fixedSim }: { sim?: Sim }) {
  const router = useRouter()
  const { drivers, setDrivers } = useRoster()
  const [sim, setSim] = useState<Sim>(fixedSim ?? 'lmu')
  const [races, setRaces] = useState<RaceRow[]>([])
  const [raceId, setRaceId] = useState<string>('new')
  const [form, setForm] = useState<Form>(BLANK)
  const [cars, setCars] = useState<CarDraft[]>([newCar(sim)])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [newDriverFor, setNewDriverFor] = useState<string | null>(null)

  const loadRace = useCallback((race: RaceRow | null, forSim: Sim) => {
    if (!race) {
      setRaceId('new')
      setForm(BLANK)
      setCars([newCar(forSim)])
      return
    }
    setRaceId(race.id)
    setForm({
      event_name: race.event_name ?? '',
      series: race.series ?? '',
      track: race.track ?? '',
      race_length: race.race_length ?? '',
      starts: isoToLocalInput(race.starts_at),
      stream_url: race.stream_url ?? '',
      published: race.published,
    })
    const loaded = [...race.race_cars]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        key: uid(),
        car_name: c.car_name ?? '',
        cls: c.class ?? CLASSES[forSim][0]!,
        driverIds: [...c.race_car_drivers].sort((a, b) => a.sort_order - b.sort_order).map((d) => d.driver_id),
      }))
    setCars(loaded.length ? loaded : [newCar(forSim)])
  }, [])

  const applyRaces = useCallback((result: Awaited<ReturnType<typeof fetchRaces>>, forSim: Sim, select?: string) => {
    if ('error' in result) {
      setStatus({ kind: 'error', text: result.error })
      return
    }
    setRaces(result.rows)
    loadRace(result.rows.find((r) => r.id === select) ?? result.rows[0] ?? null, forSim)
  }, [loadRace])

  const loadRaces = async (forSim: Sim, select?: string) => applyRaces(await fetchRaces(forSim), forSim, select)

  useEffect(() => {
    let cancelled = false
    fetchRaces(sim).then((result) => {
      if (!cancelled) applyRaces(result, sim)
    })
    return () => {
      cancelled = true
    }
  }, [sim, applyRaces])

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const updateCar = (key: string, patch: Partial<CarDraft>) =>
    setCars((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)))

  const byId = new Map(drivers.map((d) => [d.id, d]))
  const simDrivers = drivers.filter((d) => !d.archived)

  function startFromMain() {
    setCars([{ ...newCar(sim), driverIds: simDrivers.filter((d) => d.main_lineup.includes(sim)).map((d) => d.id) }])
  }

  async function save() {
    setBusy(true)
    setStatus(null)
    const supabase = createClient()
    try {
      const payload = {
        sim,
        event_name: form.event_name.trim() || null,
        series: form.series.trim() || null,
        track: form.track.trim() || null,
        race_length: form.race_length.trim() || null,
        starts_at: localInputToIso(form.starts),
        stream_url: form.stream_url.trim() || null,
        published: form.published,
      }
      let id = raceId
      if (id === 'new') {
        const { data, error } = await supabase.from('races').insert(payload).select('id').single()
        if (error) throw error
        id = data.id as string
      } else {
        const { error } = await supabase.from('races').update(payload).eq('id', id)
        if (error) throw error
      }

      // Replace the lineup wholesale: simplest way to keep car order and drivers in sync.
      const { error: delError } = await supabase.from('race_cars').delete().eq('race_id', id)
      if (delError) throw delError
      for (const [i, car] of cars.entries()) {
        const { data: inserted, error } = await supabase
          .from('race_cars')
          .insert({ race_id: id, car_name: car.car_name.trim() || null, class: car.cls, sort_order: i })
          .select('id')
          .single()
        if (error) throw error
        if (car.driverIds.length) {
          const { error: dErr } = await supabase
            .from('race_car_drivers')
            .insert(car.driverIds.map((driver_id, j) => ({ car_id: inserted.id, driver_id, sort_order: j })))
          if (dErr) throw dErr
        }
      }

      await Promise.all([refreshPublicPages(), syncRaceToDiscord(id)])
      router.refresh()
      await loadRaces(sim, id)
      setStatus({ kind: 'ok', text: form.published ? 'Saved and live (and updated on Discord).' : 'Saved as a draft (not shown publicly).' })
    } catch (e) {
      setStatus({ kind: 'error', text: errorText(e) })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (raceId === 'new' || !confirm('Delete this race and its lineup?')) return
    setBusy(true)
    await removeRaceFromDiscord(raceId)
    const { error } = await createClient().from('races').delete().eq('id', raceId)
    setBusy(false)
    if (error) return setStatus({ kind: 'error', text: errorText(error) })
    await refreshPublicPages()
    router.refresh()
    await loadRaces(sim)
    setStatus({ kind: 'ok', text: 'Race deleted.' })
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <h3 className="mr-auto font-heading text-lg font-bold">Next race · {SIM_SHORT[sim]}</h3>
        {!fixedSim && (
          <label className={label}>Sim
            <select className={field} value={sim} onChange={(e) => setSim(e.target.value as Sim)}>
              <option value="lmu">LMU</option>
              <option value="acc">ACC</option>
            </select>
          </label>
        )}
        <label className={label}>Race
          <select className={field} value={raceId} onChange={(e) => loadRace(races.find((r) => r.id === e.target.value) ?? null, sim)}>
            {races.map((r) => (
              <option key={r.id} value={r.id}>
                {[r.track ?? r.event_name ?? 'Untitled', r.starts_at && new Date(r.starts_at).toLocaleDateString(), !r.published && '(draft)'].filter(Boolean).join(' · ')}
              </option>
            ))}
            <option value="new">+ New race</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>Event<input className={field} value={form.event_name} onChange={set('event_name')} placeholder="Championship · Round" /></label>
        <label className={label}>Series<input className={field} value={form.series} onChange={set('series')} /></label>
        <label className={label}>Track<input className={field} value={form.track} onChange={set('track')} /></label>
        <label className={label}>Race length<input className={field} value={form.race_length} onChange={set('race_length')} placeholder="e.g. 6 hours" /></label>
        <label className={label}>Green flag (your time)<input className={field} type="datetime-local" value={form.starts} onChange={set('starts')} /></label>
        <label className={label}>Stream link<input className={field} type="url" value={form.stream_url} onChange={set('stream_url')} placeholder="https://" /></label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-semibold">Lineup</h4>
        <button type="button" className={smallBtn} onClick={startFromMain}>Start from main lineup</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {cars.map((car) => {
          const available = simDrivers.filter((d) => !car.driverIds.includes(d.id))
          const main = available.filter((d) => d.main_lineup.includes(sim))
          const academy = available.filter((d) => !d.main_lineup.includes(sim) && d.academy)
          const others = available.filter((d) => !d.main_lineup.includes(sim) && !d.academy)
          return (
            <div key={car.key} className="flex flex-col gap-3 rounded-lg border border-line p-3 sm:p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
                <input aria-label="Car" className={field} value={car.car_name} onChange={(e) => updateCar(car.key, { car_name: e.target.value })} placeholder="Car" />
                <select aria-label="Class" className={field} value={car.cls} onChange={(e) => updateCar(car.key, { cls: e.target.value })}>
                  {CLASSES[sim].map((c) => <option key={c}>{c}</option>)}
                </select>
                <button type="button" aria-label="Remove car" className={smallBtn} onClick={() => setCars((cs) => cs.filter((c) => c.key !== car.key))}>✕</button>
              </div>
              <ul className="flex flex-col">
                {car.driverIds.map((id) => {
                  const d = byId.get(id)
                  const badge = d && lineupBadge(d, sim)
                  return (
                    <li key={id} className="flex items-center gap-2 border-b border-mist py-2 last:border-0">
                      <span className="flex-1 font-medium">{d?.name ?? 'Unknown driver'}</span>
                      {badge && <span className={`rounded border px-1.5 text-[11px] font-semibold ${badge === 'ACADEMY' ? 'border-iris-deep text-iris-deep' : 'border-[#cbd1d9]'}`}>{badge}</span>}
                      <button type="button" aria-label={`Remove ${d?.name ?? 'driver'}`} className={smallBtn} onClick={() => updateCar(car.key, { driverIds: car.driverIds.filter((x) => x !== id) })}>✕</button>
                    </li>
                  )
                })}
                {car.driverIds.length === 0 && <li className="py-2 text-sm text-muted">No drivers yet.</li>}
              </ul>
              <label className={label}>Add a driver
                <select
                  className={`${field} border-dashed border-iris-deep bg-[#f4f4fe]`}
                  value=""
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '__new') setNewDriverFor(car.key)
                    else if (v) updateCar(car.key, { driverIds: [...car.driverIds, v] })
                  }}
                >
                  <option value="">Choose from the roster…</option>
                  <optgroup label={`${SIM_SHORT[sim]} main lineup`}>
                    {main.map((d) => <option key={d.id} value={d.id}>{d.name}{d.role_tag ? ` · ${d.role_tag}` : ''}</option>)}
                  </optgroup>
                  {academy.length > 0 && (
                    <optgroup label="Academy drivers">
                      {academy.map((d) => <option key={d.id} value={d.id}>{d.name}{d.sims.includes(sim) ? '' : ` (not usually ${SIM_SHORT[sim]})`}</option>)}
                    </optgroup>
                  )}
                  <optgroup label="Reserves, guests and other drivers">
                    {others.map((d) => <option key={d.id} value={d.id}>{d.name}{d.sims.includes(sim) ? '' : ` (not usually ${SIM_SHORT[sim]})`}</option>)}
                  </optgroup>
                  <option value="__new">+ New driver…</option>
                </select>
              </label>
              {newDriverFor === car.key && (
                <NewDriverForm
                  sim={sim}
                  onCancel={() => setNewDriverFor(null)}
                  onCreated={(d) => {
                    setDrivers((ds) => [...ds, d])
                    updateCar(car.key, { driverIds: [...car.driverIds, d.id] })
                    setNewDriverFor(null)
                  }}
                />
              )}
            </div>
          )
        })}
        <button type="button" className="min-h-24 rounded-lg border-2 border-dashed border-[#cbd1d9] font-semibold text-[#4a4f57]" onClick={() => setCars((cs) => [...cs, newCar(sim)])}>
          + Add another car
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={form.published} onChange={set('published')} className="h-5 w-5" />
          Show publicly
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          {raceId !== 'new' && <button type="button" className={dangerBtn} disabled={busy} onClick={remove}>Delete race</button>}
          <button type="button" className={primaryBtn} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save race'}</button>
        </div>
      </div>
      {status && (
        <p role="status" className={status.kind === 'ok' ? 'text-sm text-ice-deep' : 'text-sm text-[#8a1c1c]'}>{status.text}</p>
      )}
    </div>
  )
}

function NewDriverForm({ sim, onCreated, onCancel }: { sim: Sim; onCreated: (d: AdminDriver) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [country, setCountry] = useState('US')
  const [main, setMain] = useState(false)
  const [academy, setAcademy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!name.trim()) return setError('Name is required.')
    setBusy(true)
    const { data, error } = await createClient()
      .from('drivers')
      .insert({ name: name.trim(), nickname: nickname.trim() || null, country_code: country || null, sims: [sim], main_lineup: main ? [sim] : [], academy })
      .select('id, name, nickname, country_code, role_tag, sims, main_lineup, photo_path, academy, academy_class, lmu_dr_tier, lmu_dr_level, lmu_dr_updated_on, archived, sort_order, profile_id')
      .single()
    setBusy(false)
    if (error) return setError(errorText(error))
    onCreated(data as AdminDriver)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#cbd1d9] bg-mist p-3">
      <span className="font-semibold">New driver</span>
      <label className={label}>Name<input className={field} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>Nickname (optional)<input className={field} value={nickname} onChange={(e) => setNickname(e.target.value)} /></label>
        <label className={label}>Country
          <select className={field} value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Not set</option>
            {getCountryOptions().map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={main} onChange={(e) => setMain(e.target.checked)} className="h-5 w-5" />
        Also add to the {SIM_SHORT[sim]} main lineup
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={academy} onChange={(e) => setAcademy(e.target.checked)} className="h-5 w-5" />
        Academy driver (shown as ACADEMY instead of GUEST)
      </label>
      {error && <p className="text-sm text-[#8a1c1c]">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className={primaryBtn} disabled={busy} onClick={create}>Add to roster and car</button>
        <button type="button" className={smallBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
