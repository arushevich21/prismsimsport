'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const supabase = createClient()

export default function Nav() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })

    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      window.removeEventListener('scroll', handler)
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 48px',
      background: scrolled
        ? 'rgba(13,12,11,0.96)'
        : 'linear-gradient(to bottom, rgba(13,12,11,0.75) 0%, transparent 100%)',
      backdropFilter: scrolled ? 'blur(8px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      transition: 'background 0.4s ease, border-color 0.4s ease',
    }}>
      <div onClick={() => router.push('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <Image
          src="/logo.png"
          alt="DTS Academy"
          width={160}
          height={52}
          style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
          priority
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {user ? (
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'none', color: 'var(--cream)',
              border: '1px solid rgba(200,194,181,0.3)',
              padding: '10px 24px', fontSize: '13px', fontWeight: 500,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cream)'; e.currentTarget.style.color = 'var(--off-white)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,194,181,0.3)'; e.currentTarget.style.color = 'var(--cream)' }}
          >
            Dashboard
          </button>
        ) : (
          <button
            onClick={() => router.push('/login')}
            style={{
              background: 'none', color: 'var(--cream)',
              border: '1px solid rgba(200,194,181,0.3)',
              padding: '10px 24px', fontSize: '13px', fontWeight: 500,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cream)'; e.currentTarget.style.color = 'var(--off-white)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,194,181,0.3)'; e.currentTarget.style.color = 'var(--cream)' }}
          >
            Sign In
          </button>
        )}
        <button
          onClick={() => router.push(user ? '/dashboard' : '/login?next=/apply')}
          style={{
            background: 'var(--red)', color: 'var(--off-white)', border: 'none',
            padding: '10px 24px', fontSize: '13px', fontWeight: 500,
            letterSpacing: '1.5px', textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--red-dim)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--red)'}
        >
          Interested?
        </button>
      </div>
    </nav>
  )
}
