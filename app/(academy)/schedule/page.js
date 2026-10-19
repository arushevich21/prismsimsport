'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

const CAL_USERNAME = 'dts-anton'

const TIERS = [
  {
    minutes: 30,
    slug: 'coaching-30',
    price: '$20',
    bestFor: 'Quick telemetry review or dialing in a single corner or sector',
  },
  {
    minutes: 60,
    slug: 'coaching-60',
    price: '$35',
    bestFor: 'A full session on one track: driving, data, and setup',
  },
  {
    minutes: 90,
    slug: 'coaching-90',
    price: '$50',
    bestFor: 'Deep dive across multiple tracks or full race-weekend prep',
  },
]

const COACHING_TYPES = [
  {
    label: 'Live Coaching',
    desc: 'I watch you drive in real time and call out corrections as they happen — immediate feedback on braking, trail-braking, and car placement.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10,8 16,12 10,16" />
      </svg>
    ),
  },
  {
    label: 'Telemetry & Replay Review',
    desc: 'We break down your data and inputs lap by lap to find where time is being left on the table — throttle, brake, and steering trace analysis.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: 'Setup Work',
    desc: 'Dialing in the car to your driving style and the track — we work through aero, suspension, and balance to get you comfortable and fast.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
  {
    label: 'Race Prep & Strategy',
    desc: 'Qualifying approach, race pace management, tyre and fuel planning — building a full race weekend game plan for your next event.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3h18v4H3z" />
        <path d="M3 11h18v2H3z" />
        <path d="M3 17h10v4H3z" />
      </svg>
    ),
  },
]

export default function Schedule() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [selectedTier, setSelectedTier] = useState(60)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return }

      const { data: member } = await supabase
        .from('members')
        .select('active')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (!member?.active) { router.replace('/dashboard'); return }

      setUser(data.user)
    })
  }, [])

  if (!user) return null

  const activeTier = TIERS.find(t => t.minutes === selectedTier)
  const calUrl = `https://cal.com/${CAL_USERNAME}/${activeTier.slug}?theme=dark`

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--dark)',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `
          repeating-linear-gradient(90deg, transparent, transparent 119px, rgba(255,255,255,0.02) 119px, rgba(255,255,255,0.02) 120px),
          repeating-linear-gradient(0deg, transparent, transparent 119px, rgba(255,255,255,0.02) 119px, rgba(255,255,255,0.02) 120px)
        `,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto', padding: '80px 48px 80px' }}>

        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '2px',
            textTransform: 'uppercase', fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '32px', padding: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--cream)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="11,6 5,12 11,18" />
          </svg>
          Back to dashboard
        </button>

        {/* Heading */}
        <div style={{ marginBottom: '56px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
            textTransform: 'uppercase', color: 'var(--red)',
            marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ width: '24px', height: '1px', background: 'var(--red)', display: 'block' }} />
            Coaching
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 6vw, 72px)',
            letterSpacing: '4px', color: 'var(--off-white)',
            lineHeight: 0.92, marginBottom: '16px',
          }}>
            BOOK A<br /><span style={{ color: 'var(--red)' }}>SESSION</span>
          </h1>
          <p style={{
            fontSize: '14px', fontWeight: 300, color: 'var(--text-muted)',
            lineHeight: 1.7, maxWidth: '480px',
          }}>
            One-on-one coaching tailored to your sim racing goals. Pick your session length below and choose a time that works for you.
          </p>
        </div>

        {/* What we can work on */}
        <div style={{ marginBottom: '56px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            marginBottom: '20px',
          }}>What we can work on</div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '2px',
          }}>
            {COACHING_TYPES.map((type, i) => (
              <div key={i} style={{
                background: 'var(--dark-3)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderLeft: '3px solid rgba(232,25,44,0.3)',
                padding: '24px 28px',
                display: 'flex', gap: '16px',
              }}>
                <div style={{ color: 'var(--red)', flexShrink: 0, paddingTop: '2px' }}>{type.icon}</div>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '18px',
                    letterSpacing: '2px', color: 'var(--off-white)', marginBottom: '8px',
                  }}>{type.label.toUpperCase()}</div>
                  <div style={{
                    fontSize: '13px', fontWeight: 300,
                    color: 'var(--text-muted)', lineHeight: 1.6,
                  }}>{type.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session tier selector */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            marginBottom: '20px',
          }}>Choose your session length</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px', marginBottom: '16px' }}>
            {TIERS.map(tier => {
              const active = selectedTier === tier.minutes
              return (
                <button
                  key={tier.minutes}
                  onClick={() => setSelectedTier(tier.minutes)}
                  style={{
                    background: active ? 'var(--dark-4)' : 'var(--dark-3)',
                    border: active ? '1px solid rgba(232,25,44,0.5)' : '1px solid rgba(255,255,255,0.05)',
                    borderTop: active ? '2px solid var(--red)' : '2px solid transparent',
                    padding: '28px 24px', textAlign: 'left', cursor: 'pointer',
                    transition: 'background 0.2s, border-color 0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--dark-4)'
                      e.currentTarget.style.borderColor = 'rgba(232,25,44,0.2)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--dark-3)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '36px',
                      letterSpacing: '2px', color: active ? 'var(--off-white)' : 'var(--cream)',
                      lineHeight: 1,
                    }}>{tier.minutes}<span style={{ fontSize: '16px', letterSpacing: '1px', color: 'var(--text-muted)', marginLeft: '4px' }}>MIN</span></div>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '28px',
                      letterSpacing: '1px', color: 'var(--red)',
                      lineHeight: 1,
                    }}>{tier.price}</div>
                  </div>
                  <div style={{
                    fontSize: '12px', fontWeight: 300,
                    color: 'var(--text-muted)', lineHeight: 1.5,
                  }}>{tier.bestFor}</div>
                  {active && (
                    <div style={{
                      position: 'absolute', top: '12px', right: '12px',
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'var(--red)',
                    }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Payment note */}
          <div style={{
            background: 'var(--dark-2)',
            border: '1px solid rgba(255,255,255,0.05)',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 300, color: 'var(--text-muted)', letterSpacing: '0.3px' }}>
              Payment is handled via Venmo — send{' '}
              <span style={{ color: 'var(--cream)', fontWeight: 500 }}>{activeTier.price}</span>{' '}
              to <span style={{ color: 'var(--cream)', fontWeight: 500 }}>@arushevich</span> after booking.
            </span>
          </div>
        </div>

        {/* Cal.com embed */}
        <div style={{
          background: 'var(--dark-3)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderTop: '2px solid var(--red)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '14px',
              letterSpacing: '2px', color: 'var(--off-white)',
            }}>
              {activeTier.minutes}-MINUTE SESSION — {activeTier.price}
            </span>
          </div>
          <iframe
            key={calUrl}
            src={calUrl}
            style={{
              width: '100%',
              height: '700px',
              border: 'none',
              display: 'block',
            }}
            title="Book a coaching session"
          />
        </div>

      </div>
    </div>
  )
}
