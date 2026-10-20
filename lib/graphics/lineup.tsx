import { ImageResponse } from 'next/og'
import { TEAM_TIMEZONE } from '@/lib/site'
import { SIM_LABEL, carStart, type Race, type RaceCar } from '@/lib/types'
import { C, CarMark, ClassChip, SponsorFooter, loadFonts } from './shared'

// The tall (9:16) lineup graphic the bot attaches to lineup posts on Discord.

const W = 1080
const H = 1920
function when(iso: string) {
  const d = new Date(iso)
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: TEAM_TIMEZONE, ...o }).format(d)
  const zone = new Intl.DateTimeFormat('en-US', { timeZone: TEAM_TIMEZONE, timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? ''
  return { day: part({ weekday: 'long' }).toUpperCase(), date: part({ month: 'short', day: 'numeric' }).toUpperCase(), time: part({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }), zone }
}

function CarCard({ car, race, origin, compact }: { car: RaceCar; race: Race; origin: string; compact: boolean }) {
  const start = carStart(car, race)
  const t = start ? when(start) : null
  const cls = car.class ?? ''
  const nameSize = compact ? 28 : 32
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 16 : 24, background: C.card, border: `2px solid ${C.line}`, borderRadius: 24, padding: compact ? '28px 40px' : '40px 44px' }}>
      {t && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 24, letterSpacing: 3, color: C.muted }}>{`${t.day} · ${t.date}`}</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontFamily: 'Unbounded', fontWeight: 800, fontSize: compact ? 52 : 64, color: race.sim === 'acc' ? C.ember : C.ice }}>{t.time}</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 22, color: C.muted }}>{t.zone}</span>
          </span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <CarMark car={car.car_name} origin={origin} />
        {cls && <ClassChip cls={cls} />}
        <span style={{ fontFamily: 'Unbounded', fontWeight: 700, fontSize: nameSize, flex: 1 }}>{car.car_name ?? 'Car'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
        {car.drivers.length ? (
          car.drivers.map((d) => (
            <span key={d.id} style={{ fontFamily: 'Archivo', fontWeight: 600, fontSize: compact ? 32 : 36 }}>{d.name}</span>
          ))
        ) : (
          <span style={{ fontFamily: 'Archivo', fontWeight: 600, fontSize: 32, color: C.muted }}>Drivers to be confirmed</span>
        )}
      </div>
    </div>
  )
}

export async function renderLineupGraphic(race: Race, origin: string, only?: string[]) {
  const cars = (only?.length ? race.cars.filter((c) => only.includes(c.id)) : race.cars).slice(0, 4)
  const compact = cars.length > 2
  const title = race.event_name ?? race.series ?? race.track ?? 'Race week'
  const titleSize = title.length <= 16 ? 104 : title.length <= 26 ? 84 : 66

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', gap: compact ? 40 : 56, padding: '120px 80px 110px', background: C.ground, color: C.white, fontFamily: 'Archivo' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser */}
          <img src={`${origin}/brand/prism-logo.png`} alt="" width={191} height={72} />
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 24, letterSpacing: 4, color: race.sim === 'acc' ? C.ember : C.ice }}>
            {`RACE WEEK · ${SIM_LABEL[race.sim].toUpperCase()}`}
          </span>
          <span style={{ fontFamily: 'Unbounded', fontWeight: 800, fontSize: titleSize, lineHeight: 1.02, textWrap: 'balance' }}>{title}</span>
          {race.track && race.track !== title && (
            <span style={{ fontFamily: 'Archivo', fontWeight: 600, fontSize: 30, color: C.muted }}>{[race.track, race.race_length].filter(Boolean).join(' · ')}</span>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: compact ? 20 : 32 }}>
          {cars.map((car) => <CarCard key={car.id} car={car} race={race} origin={origin} compact={compact} />)}
        </div>

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
