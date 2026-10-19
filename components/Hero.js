'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function Hero() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [visible, setVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check, { passive: true })

    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const t = setTimeout(() => setVisible(true), 80)

    return () => {
      window.removeEventListener('resize', check)
      clearTimeout(t)
    }
  }, [])

  return (
    <section style={{
      position: 'relative',
      height: '100vh', minHeight: '600px',
      overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Poster — always shown as base; video covers it on desktop once loaded */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'url(/hero-poster.jpg)',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }} />

      {/* Video — desktop only */}
      {!isMobile && (
        <video
          autoPlay loop muted playsInline
          poster="/hero-poster.jpg"
          style={{
            position: 'absolute', inset: 0, zIndex: 1,
            width: '100%', height: '100%', objectFit: 'cover',
          }}
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
      )}

      {/* Subtle grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: `
          repeating-linear-gradient(90deg, transparent, transparent 119px, rgba(255,255,255,0.015) 119px, rgba(255,255,255,0.015) 120px),
          repeating-linear-gradient(0deg, transparent, transparent 119px, rgba(255,255,255,0.015) 119px, rgba(255,255,255,0.015) 120px)
        `,
      }} />

      {/* Dark gradient — text legibility */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        background: 'linear-gradient(to bottom, rgba(26,3,6,0.6) 0%, rgba(13,12,11,0.65) 45%, rgba(13,12,11,0.92) 100%)',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 4,
        textAlign: 'center',
        padding: '0 48px',
        maxWidth: '960px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: 'opacity 1.1s ease, transform 1.1s ease',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
          fontSize: '11px', fontWeight: 500, letterSpacing: '4px',
          textTransform: 'uppercase', color: 'var(--red)',
          marginBottom: '32px',
        }}>
          <span style={{ width: '32px', height: '1px', background: 'var(--red)', display: 'block' }} />
          Elite Sim Racing Coaching
          <span style={{ width: '32px', height: '1px', background: 'var(--red)', display: 'block' }} />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(72px, 13vw, 148px)',
          letterSpacing: '6px', lineHeight: 0.88,
          color: 'var(--off-white)',
          marginBottom: '36px',
        }}>
          DRIVE. THINK.<br /><span style={{ color: 'var(--red)' }}>SUCCEED.</span>
        </h1>

        <p style={{
          fontSize: '16px', fontWeight: 300,
          color: 'var(--cream)', lineHeight: 1.75,
          maxWidth: '440px', margin: '0 auto 52px',
          letterSpacing: '0.3px',
        }}>
          Personalized 1-on-1 coaching for sim racers serious about finding time on the limit.
        </p>

        <button
          onClick={() => router.push(user ? '/dashboard' : '/login?next=/apply')}
          style={{
            background: 'var(--red)', color: 'var(--off-white)', border: 'none',
            padding: '18px 52px', fontSize: '13px', fontWeight: 500,
            letterSpacing: '2.5px', textTransform: 'uppercase',
            fontFamily: 'var(--font-body)', cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--red-dim)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--red)'}
        >
          Interested?
        </button>
      </div>

      {/* Red accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '2px', background: 'var(--red)', zIndex: 5,
      }} />
    </section>
  )
}
