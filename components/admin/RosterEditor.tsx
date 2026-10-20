'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { refreshPublicPages, syncRoles } from '@/lib/admin/actions'
import { dangerBtn, errorText, field, getCountryOptions, label, primaryBtn, resizeImage, smallBtn, uid } from '@/lib/admin/shared'
import { driverPhotoUrl } from '@/lib/photos'
import { createClient } from '@/lib/supabase/client'
import { CLASSES, DR_TIERS, SIMS, SIM_SHORT, type DriverRankTier, type Sim } from '@/lib/types'
import { useRoster, type AdminDriver } from './useRoster'

type Filter = Sim | 'all' | 'archived'

const editable = (d: AdminDriver) => ({
  name: d.name,
  nickname: d.nickname,
  country_code: d.country_code,
  role_tag: d.role_tag,
  sims: d.sims,
  main_lineup: d.main_lineup.filter((s) => d.sims.includes(s)),
  academy: d.academy,
  academy_class: d.academy ? d.academy_class : null,
  lmu_dr_tier: d.lmu_dr_tier,
  lmu_dr_level: d.lmu_dr_tier ? d.lmu_dr_level : null,
  lmu_dr_updated_on: d.lmu_dr_updated_on,
  sort_order: d.sort_order,
  archived: d.archived,
  profile_id: d.profile_id,
})

export default function RosterEditor({ sim }: { sim: Sim }) {
  const router = useRouter()
  const { drivers, setDrivers, loaded, reload } = useRoster()
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>(sim)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [accounts, setAccounts] = useState<{ id: string; label: string }[]>([])

  // Site accounts that can be linked to a driver (for Discord roles and mentions).
  useEffect(() => {
    let cancelled = false
    createClient()
      .from('profiles')
      .select('id, display_name, discord_username')
      .order('display_name')
      .then(({ data }) => {
        if (cancelled) return
        setAccounts((data ?? []).map((p) => ({
          id: p.id as string,
          label: [p.display_name, p.discord_username && `@${p.discord_username}`].filter(Boolean).join(' · ') || 'Unnamed account',
        })))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const patch = (id: string, p: Partial<AdminDriver>) => {
    setDrivers((ds) => ds.map((d) => (d.id === id ? { ...d, ...p } : d)))
    setDirty((s) => new Set(s).add(id))
  }
  const today = () => new Date().toLocaleDateString('en-CA')
  // Picking a rank stamps today's date so the site can say how fresh it is.
  const setRank = (id: string, tier: DriverRankTier | null, level: number | null) =>
    patch(id, { lmu_dr_tier: tier, lmu_dr_level: tier ? level : null, lmu_dr_updated_on: tier ? today() : null })
  const toggle = (list: Sim[], s: Sim, on: boolean) => (on ? [...new Set([...list, s])] : list.filter((x) => x !== s))

  const shown = drivers.filter((d) =>
    filter === 'archived' ? d.archived : !d.archived && (filter === 'all' || d.sims.includes(filter))
  )

  function addDriver() {
    const id = `new-${uid()}`
    setDrivers((ds) => [
      { id, name: '', nickname: null, country_code: null, role_tag: null, sims: [sim], main_lineup: [], photo_path: null, academy: false, academy_class: null, lmu_dr_tier: null, lmu_dr_level: null, lmu_dr_updated_on: null, archived: false, sort_order: 99, profile_id: null },
      ...ds,
    ])
    setDirty((s) => new Set(s).add(id))
    if (filter === 'archived') setFilter(sim)
  }

  async function saveAll() {
    const supabase = createClient()
    const changed = drivers.filter((d) => dirty.has(d.id))
    if (changed.some((d) => !d.name.trim())) return setStatus({ kind: 'error', text: 'Every driver needs a name.' })
    setBusy(true)
    setStatus(null)
    try {
      for (const d of changed) {
        const values = { ...editable(d), name: d.name.trim() }
        const { error } = d.id.startsWith('new-')
          ? await supabase.from('drivers').insert(values)
          : await supabase.from('drivers').update(values).eq('id', d.id)
        if (error) throw error
      }
      setDirty(new Set())
      await reload()
      await Promise.all([refreshPublicPages(), syncRoles()])
      router.refresh()
      setStatus({ kind: 'ok', text: `Saved ${changed.length} driver${changed.length === 1 ? '' : 's'}.` })
    } catch (e) {
      setStatus({ kind: 'error', text: errorText(e) })
    } finally {
      setBusy(false)
    }
  }

  async function remove(d: AdminDriver) {
    if (d.id.startsWith('new-')) {
      setDrivers((ds) => ds.filter((x) => x.id !== d.id))
      return
    }
    if (!confirm(`Delete ${d.name} for good? They'll also be removed from any race lineups. (Archiving keeps their history.)`)) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('drivers').delete().eq('id', d.id)
    if (!error && d.photo_path) await supabase.storage.from('driver-photos').remove([d.photo_path])
    setBusy(false)
    if (error) return setStatus({ kind: 'error', text: errorText(error) })
    await reload()
    await refreshPublicPages()
    router.refresh()
  }

  async function uploadPhoto(d: AdminDriver, file: File | undefined) {
    if (!file) return
    if (d.id.startsWith('new-')) return setStatus({ kind: 'error', text: 'Save the new driver first, then add a photo.' })
    setBusy(true)
    setStatus(null)
    const supabase = createClient()
    try {
      const blob = await resizeImage(file)
      const path = `${d.id}/${crypto.randomUUID()}.webp`
      const { error: upErr } = await supabase.storage.from('driver-photos').upload(path, blob, { contentType: 'image/webp' })
      if (upErr) throw upErr
      const { error } = await supabase.from('drivers').update({ photo_path: path }).eq('id', d.id)
      if (error) throw error
      if (d.photo_path) await supabase.storage.from('driver-photos').remove([d.photo_path])
      setDrivers((ds) => ds.map((x) => (x.id === d.id ? { ...x, photo_path: path } : x)))
      await refreshPublicPages()
      router.refresh()
      setStatus({ kind: 'ok', text: `Photo updated for ${d.name}.` })
    } catch (e) {
      setStatus({ kind: 'error', text: errorText(e) })
    } finally {
      setBusy(false)
    }
  }

  async function removePhoto(d: AdminDriver) {
    if (!d.photo_path) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('drivers').update({ photo_path: null }).eq('id', d.id)
    if (!error) await supabase.storage.from('driver-photos').remove([d.photo_path])
    setBusy(false)
    if (error) return setStatus({ kind: 'error', text: errorText(error) })
    setDrivers((ds) => ds.map((x) => (x.id === d.id ? { ...x, photo_path: null } : x)))
    await refreshPublicPages()
    router.refresh()
  }

  const countries = getCountryOptions()

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto flex flex-col gap-1">
          <h3 className="font-heading text-lg font-bold">Driver roster</h3>
          <p className="text-sm text-muted">Admins only. Visitors see drivers on a main lineup, plus anyone in a published race lineup.</p>
        </div>
        <label className={label}>Show
          <select className={field} value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="lmu">LMU drivers</option>
            <option value="acc">ACC drivers</option>
            <option value="all">Everyone</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button type="button" className={smallBtn} onClick={addDriver}>+ Add driver</button>
      </div>

      {!loaded && <p className="text-sm text-muted">Loading roster…</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((d) => {
          const photo = driverPhotoUrl(d.photo_path)
          return (
            <div key={d.id} className={`flex flex-col gap-3 rounded-lg border p-3 sm:p-4 ${dirty.has(d.id) ? 'border-iris-deep' : 'border-line'}`}>
              <div className="flex gap-3">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-graphite">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded photo */}
                  {photo && <img src={photo} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <label className={`${smallBtn} cursor-pointer`}>
                    {d.photo_path ? 'Replace photo' : 'Upload photo'}
                    <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => uploadPhoto(d, e.target.files?.[0])} />
                  </label>
                  {d.photo_path && <button type="button" className={smallBtn} disabled={busy} onClick={() => removePhoto(d)}>Remove photo</button>}
                </div>
              </div>
              <label className={label}>Name<input className={field} value={d.name} onChange={(e) => patch(d.id, { name: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className={label}>Nickname<input className={field} value={d.nickname ?? ''} onChange={(e) => patch(d.id, { nickname: e.target.value || null })} /></label>
                <label className={label}>Role tag<input className={field} value={d.role_tag ?? ''} onChange={(e) => patch(d.id, { role_tag: e.target.value || null })} placeholder="e.g. Reserve" /></label>
              </div>
              <label className={label}>Country
                <select className={field} value={d.country_code ?? ''} onChange={(e) => patch(d.id, { country_code: e.target.value || null })}>
                  <option value="">Not set</option>
                  {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </label>
              <label className={label}>Linked Discord account
                <select className={field} value={d.profile_id ?? ''} onChange={(e) => patch(d.id, { profile_id: e.target.value || null })}>
                  <option value="">Not linked</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </label>
              <fieldset className="grid grid-cols-2 gap-x-3 text-sm">
                <legend className="mb-1 text-[13px] text-[#4a4f57]">Races in · on main lineup</legend>
                {SIMS.map((s) => (
                  <div key={s} className="flex flex-col">
                    <label className="flex min-h-10 items-center gap-2">
                      <input type="checkbox" className="h-5 w-5" checked={d.sims.includes(s)} onChange={(e) => patch(d.id, { sims: toggle(d.sims, s, e.target.checked), main_lineup: e.target.checked ? d.main_lineup : d.main_lineup.filter((x) => x !== s) })} />
                      {SIM_SHORT[s]}
                    </label>
                    <label className={`flex min-h-10 items-center gap-2 ${d.sims.includes(s) ? '' : 'opacity-40'}`}>
                      <input type="checkbox" className="h-5 w-5" disabled={!d.sims.includes(s)} checked={d.main_lineup.includes(s)} onChange={(e) => patch(d.id, { main_lineup: toggle(d.main_lineup, s, e.target.checked) })} />
                      {SIM_SHORT[s]} main lineup
                    </label>
                  </div>
                ))}
              </fieldset>
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input type="checkbox" className="h-5 w-5" checked={d.academy} onChange={(e) => patch(d.id, { academy: e.target.checked })} />
                Academy driver <span className="text-muted">(ACADEMY instead of GUEST in race lineups)</span>
              </label>
              {d.academy && (
                <label className={label}>Academy class
                  <select className={field} value={d.academy_class ?? ''} onChange={(e) => patch(d.id, { academy_class: e.target.value || null })}>
                    <option value="">Not set</option>
                    {[...new Set(d.sims.flatMap((s) => CLASSES[s]))].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
              )}
              {d.sims.includes('lmu') && (
                <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
                  <label className={label}>LMU Driver Rank
                    <select className={field} value={d.lmu_dr_tier ?? ''} onChange={(e) => setRank(d.id, (e.target.value || null) as DriverRankTier | null, d.lmu_dr_level ?? 1)}>
                      <option value="">Not set</option>
                      {DR_TIERS.map((t) => <option key={t} value={t}>{t[0]!.toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </label>
                  <label className={label}>Level
                    <select className={field} disabled={!d.lmu_dr_tier} value={d.lmu_dr_level ?? ''} onChange={(e) => setRank(d.id, d.lmu_dr_tier, Number(e.target.value))}>
                      {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  {d.lmu_dr_updated_on && <p className="col-span-2 text-[13px] text-muted">Updated {d.lmu_dr_updated_on}</p>}
                </div>
              )}
              <div className="flex flex-wrap items-end gap-2 border-t border-mist pt-3">
                <label className={`${label} w-24`}>Order<input className={field} type="number" value={d.sort_order} onChange={(e) => patch(d.id, { sort_order: Number(e.target.value) || 0 })} /></label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" className="h-5 w-5" checked={d.archived} onChange={(e) => patch(d.id, { archived: e.target.checked })} />
                  Archived
                </label>
                <button type="button" className={`${dangerBtn} ml-auto`} disabled={busy} onClick={() => remove(d)}>Delete</button>
              </div>
            </div>
          )
        })}
        {loaded && shown.length === 0 && <p className="text-sm text-muted">No drivers here yet.</p>}
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-white px-4 py-3 sm:-mx-6 sm:px-6">
        <span className="text-sm text-muted">{dirty.size ? `${dirty.size} unsaved change${dirty.size === 1 ? '' : 's'}` : 'All changes saved'}</span>
        <button type="button" className={`${primaryBtn} ml-auto`} disabled={busy || dirty.size === 0} onClick={saveAll}>{busy ? 'Saving…' : 'Save roster'}</button>
      </div>
      {status && <p role="status" className={status.kind === 'ok' ? 'text-sm text-ice-deep' : 'text-sm text-[#8a1c1c]'}>{status.text}</p>}
    </div>
  )
}
