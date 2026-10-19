'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

const DISCORD_SERVER = 'https://discord.gg/cTSU8uhp9q'

export default function Pending() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return }

      // If already approved, send them to the real dashboard
      const { data: member } = await supabase
        .from('members')
        .select('active')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (member?.active) { router.replace('/dashboard'); return }

      setUser(data.user)
    })
  }, [])

  if (!user) return null

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--dark)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `
          repeating-linear-gradient(90deg, transparent, transparent 119px, rgba(255,255,255,0.02) 119px, rgba(255,255,255,0.02) 120px),
          repeating-linear-gradient(0deg, transparent, transparent 119px, rgba(255,255,255,0.02) 119px, rgba(255,255,255,0.02) 120px)
        `,
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '520px' }}>

        {/* Pulse indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: '#FFD700',
              boxShadow: '0 0 0 0 rgba(255,215,0,0.4)',
              animation: 'pulse 2s infinite',
            }} />
            <style>{`
              @keyframes pulse {
                0%   { box-shadow: 0 0 0 0 rgba(255,215,0,0.4); }
                70%  { box-shadow: 0 0 0 12px rgba(255,215,0,0); }
                100% { box-shadow: 0 0 0 0 rgba(255,215,0,0); }
              }
            `}</style>
          </div>
        </div>

        <div style={{
          fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
          textTransform: 'uppercase', color: 'var(--red)',
          marginBottom: '16px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '10px',
        }}>
          <span style={{ width: '24px', height: '1px', background: 'var(--red)', display: 'block' }} />
          DTS Academy
          <span style={{ width: '24px', height: '1px', background: 'var(--red)', display: 'block' }} />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 7vw, 80px)',
          letterSpacing: '4px', color: 'var(--off-white)',
          lineHeight: 0.95, marginBottom: '12px',
        }}>
          APPLICATION<br /><span style={{ color: '#FFD700' }}>UNDER REVIEW</span>
        </h1>

        <p style={{
          fontSize: '14px', fontWeight: 300, color: 'var(--text-muted)',
          lineHeight: 1.8, marginBottom: '48px',
        }}>
          Your application has been received. Our coaches will review your request
          and reach out to you on Discord — usually within 24 hours.
        </p>

        {/* Info card */}
        <div style={{
          background: 'var(--dark-3)',
          border: '1px solid rgba(255,215,0,0.15)',
          borderTop: '2px solid #FFD700',
          padding: '28px 32px',
          textAlign: 'left', marginBottom: '16px',
        }}>
          <div style={{
            fontSize: '10px', fontWeight: 500, letterSpacing: '2.5px',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px',
          }}>What happens next</div>
          {[
            'A DTS coach reviews your application',
            'We reach out via Discord to confirm your spot',
            'You\'ll get access to the full member dashboard',
          ].map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              marginBottom: i < 2 ? '12px' : 0,
            }}>
              <div style={{
                width: '20px', height: '20px', flexShrink: 0,
                background: 'rgba(255,215,0,0.15)',
                border: '1px solid rgba(255,215,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: '13px',
                color: '#FFD700', letterSpacing: '1px',
              }}>{i + 1}</div>
              <div style={{
                fontSize: '13px', fontWeight: 300,
                color: 'var(--cream)', lineHeight: 1.5, paddingTop: '2px',
              }}>{step}</div>
            </div>
          ))}
        </div>

        {/* Discord link */}
        <button
          onClick={() => window.open(DISCORD_SERVER, '_blank')}
          style={{
            width: '100%', padding: '14px',
            background: '#5865F2', color: '#fff',
            border: 'none', fontSize: '13px', fontWeight: 500,
            letterSpacing: '1.5px', textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '10px', marginBottom: '2px', transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#4752C4'}
          onMouseLeave={e => e.currentTarget.style.background = '#5865F2'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
          Join the Discord Server
        </button>

        {/* Sign out */}
        <div style={{ marginTop: '32px' }}>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', color: 'var(--text-muted)',
              letterSpacing: '1.5px', textTransform: 'uppercase',
              fontFamily: 'var(--font-body)', transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--cream)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            Sign Out
          </button>
        </div>

      </div>
    </div>
  )
}
