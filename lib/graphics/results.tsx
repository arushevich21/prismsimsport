import { ImageResponse } from 'next/og'
import { SIM_LABEL, type Result } from '@/lib/types'
import { C, CarMark, ClassChip, SponsorFooter, loadFonts } from './shared'

// The results graphic (4:5) the bot attaches to result posts on Discord. One
// result gets a big finishing position; several are listed (up to six).

const W = 1080
const H = 1350
const MAX_ROWS = 6

const finishColor = (p: number | null) => (p === 1 ? '#f0cd6b' : p === 2 ? '#cfd4db' : p === 3 ? '#d9a57a' : C.ice)

// raced_on is a plain date ("2026-10-18"); read it at midday UTC so no timezone shifts the day.
const raceDate = (d: string | null) =>
  d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : ''

function Header({ result, origin }: { result: Result; origin: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser */}
      <img src={`${origin}/brand/prism-logo.png`} alt="" width={170} height={64} />
      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 22, letterSpacing: 4, color: result.sim === 'acc' ? C.ember : C.ice }}>
        {`RESULTS · ${SIM_LABEL[result.sim].toUpperCase()}`}
      </span>
    </div>
  )
}

function Single({ r, origin }: { r: Result; origin: string }) {
  const title = r.championship ?? r.track ?? 'Race result'
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 36 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
        <span style={{ fontFamily: 'Unbounded', fontWeight: 800, fontSize: 280, lineHeight: 0.9, color: finishColor(r.finish) }}>{r.finish ? `P${r.finish}` : 'DNF'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <span style={{ fontFamily: 'Unbounded', fontWeight: 800, fontSize: title.length <= 22 ? 60 : 46, lineHeight: 1.05, textWrap: 'balance' }}>{title}</span>
        {r.championship && r.track && <span style={{ fontFamily: 'Archivo', fontWeight: 600, fontSize: 34, color: C.muted }}>{r.track}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, borderTop: `2px solid ${C.line}`, paddingTop: 32 }}>
        <CarMark car={r.car} origin={origin} />
        <span style={{ fontFamily: 'Archivo', fontWeight: 700, fontSize: 32, flex: 1 }}>{r.car ?? ''}</span>
        {r.class && <ClassChip cls={r.class} />}
      </div>
      {r.raced_on && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 24, letterSpacing: 3, color: C.muted }}>{raceDate(r.raced_on)}</span>}
    </div>
  )
}

function List({ results, origin }: { results: Result[]; origin: string }) {
  const rows = results.slice(0, MAX_ROWS)
  const compact = rows.length > 4
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 28 }}>
      <span style={{ fontFamily: 'Unbounded', fontWeight: 800, fontSize: 72 }}>Race results</span>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: compact ? 12 : 18 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 28, background: C.card, border: `2px solid ${C.line}`, borderRadius: 20, padding: compact ? '16px 28px' : '24px 32px' }}>
            <span style={{ width: 150, fontFamily: 'Unbounded', fontWeight: 800, fontSize: compact ? 52 : 64, color: finishColor(r.finish) }}>{r.finish ? `P${r.finish}` : 'DNF'}</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'Archivo', fontWeight: 700, fontSize: compact ? 28 : 32 }}>{r.championship ?? r.track ?? 'Race'}</span>
              <span style={{ fontFamily: 'Archivo', fontWeight: 600, fontSize: compact ? 22 : 24, color: C.muted }}>
                {[r.championship ? r.track : null, raceDate(r.raced_on)].filter(Boolean).join(' · ')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <CarMark car={r.car} origin={origin} height={compact ? 34 : 40} maxWidth={110} />
              {r.class && <ClassChip cls={r.class} size={compact ? 16 : 18} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export async function renderResultsGraphic(results: Result[], origin: string) {
  const first = results[0]!
  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', gap: 48, padding: '72px 80px 64px', background: C.ground, color: C.white, fontFamily: 'Archivo' }}>
        <Header result={first} origin={origin} />
        {results.length === 1 ? <Single r={first} origin={origin} /> : <List results={results} origin={origin} />}
        <SponsorFooter origin={origin} />
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: await loadFonts(origin),
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' },
    }
  )
}
