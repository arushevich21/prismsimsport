'use client'

import dynamic from 'next/dynamic'
import type { Sim } from '@/lib/types'
import { useAdmin } from './AdminProvider'

// Editors are only downloaded when an admin switches to edit mode, so
// visitors never pay for them.
const loading = () => <p className="p-6 text-sm text-muted">Loading editor…</p>
const RaceEditor = dynamic(() => import('./RaceEditor'), { ssr: false, loading })
const RosterEditor = dynamic(() => import('./RosterEditor'), { ssr: false, loading })
const ResultsEditor = dynamic(() => import('./ResultsEditor'), { ssr: false, loading })

type Props =
  | { editor: 'race'; sim?: Sim; children: React.ReactNode }
  | { editor: 'roster'; sim: Sim; children: React.ReactNode }
  | { editor: 'results'; sim: Sim; season: number; children: React.ReactNode }

export function Editable(props: Props) {
  const { editing } = useAdmin()
  if (!editing) return <>{props.children}</>

  return (
    <div className="rounded-xl bg-white text-ink outline-2 outline-offset-4 outline-iris outline-dashed">
      {props.editor === 'race' && <RaceEditor sim={props.sim} />}
      {props.editor === 'roster' && <RosterEditor sim={props.sim} />}
      {props.editor === 'results' && <ResultsEditor sim={props.sim} season={props.season} />}
    </div>
  )
}
