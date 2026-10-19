'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

export default function FinalCTA() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [ref, visible] = useReveal()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  return (
    <section ref={ref} style={{
      background: 'var(--dark)',
      padding: '160px 48px',
      position: 'relative',
      textAlign: 'center',
      overflow: 'hidden',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: 'opacity 0.7s ease, transform 0.7s ease',
    }}>
      {/* Radial red glow */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '800px', height: '600px',
        background: 'radial-gradient(ellipse at center, rgba(232,25,44,0.1) 0%, transparent 65%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '720px', margin: '0 auto' }}>
        <div style={{
          fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
          textTransform: 'uppercase', color: 'var(--red)',
          marginBottom: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
        }}>
          <span style={{ width: '24px', height: '1px', background: 'var(--red)', display: 'block' }} />
          Get Started
          <span style={{ width: '24px', height: '1px', background: 'var(--red)', display: 'block' }} />
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(56px, 9vw, 116px)',
          letterSpacing: '5px', lineHeight: 0.88,
          color: 'var(--off-white)',
          marginBottom: '36px',
        }}>
          READY TO<br /><span style={{ color: 'var(--red)' }}>FIND TIME?</span>
        </h2>

        <p style={{
          fontSize: '16px', fontWeight: 300,
          color: 'var(--cream)', lineHeight: 1.75,
          marginBottom: '52px', letterSpacing: '0.3px',
          maxWidth: '480px', margin: '0 auto 52px',
        }}>
          An interest form - tell me where you're at and what you want to work on. I'll take it from there.
        </p>

        <button
          onClick={() => router.push(user ? '/dashboard' : '/login?next=/apply')}
          style={{
            background: 'var(--red)', color: 'var(--off-white)', border: 'none',
            padding: '18px 56px', fontSize: '13px', fontWeight: 500,
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
    </section>
  )
}
