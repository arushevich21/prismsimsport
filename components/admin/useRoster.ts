'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Driver } from '@/lib/types'

export type AdminDriver = Driver & { archived: boolean; sort_order: number; profile_id: string | null }

// The full roster as an admin sees it (including reserves and archived drivers).
async function fetchRoster() {
  const { data } = await createClient()
    .from('drivers')
    .select('id, name, nickname, country_code, role_tag, sims, main_lineup, photo_path, academy, academy_class, lmu_dr_tier, lmu_dr_level, lmu_dr_updated_on, archived, sort_order, profile_id')
    .order('sort_order')
    .order('name')
  return (data ?? []) as AdminDriver[]
}

export function useRoster() {
  const [drivers, setDrivers] = useState<AdminDriver[]>([])
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    setDrivers(await fetchRoster())
    setLoaded(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchRoster().then((rows) => {
      if (cancelled) return
      setDrivers(rows)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { drivers, setDrivers, loaded, reload }
}
