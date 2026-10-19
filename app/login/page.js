'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function Login() {
  const router = useRouter()

  // If already authenticated, skip the login screen entirely
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/dashboard')
    })
  }, [])

  const handleDiscordLogin = async () => {
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next')
    const SAFE_PATHS = ['/apply', '/dashboard', '/pending', '/admin', '/library', '/setups', '/schedule', '/telemetry', '/members']
    const redirectPath = SAFE_PATHS.includes(next) ? next : '/dashboard'
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
      },
    })
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.06)',
        padding: '48px', width: '100%', maxWidth: '420px',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '22px',
          letterSpacing: '3px', color: 'var(--off-white)', marginBottom: '8px',
        }}>
          DTS <span style={{ color: 'var(--red)' }}>Academy</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '36px',
          letterSpacing: '2px', color: 'var(--off-white)', marginBottom: '12px',
        }}>SIGN IN</h1>

        <p style={{
          fontSize: '14px', fontWeight: 300, color: 'var(--text-muted)',
          marginBottom: '40px', lineHeight: 1.6,
        }}>
          Access your coaching sessions and video library through your Discord account.
        </p>

        <button
          onClick={handleDiscordLogin}
          style={{
            width: '100%', padding: '16px',
            background: '#5865F2',
            color: '#fff', border: 'none',
            fontSize: '14px', fontWeight: 500, letterSpacing: '1px',
            textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '12px',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#4752C4'}
          onMouseLeave={e => e.currentTarget.style.background = '#5865F2'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Continue with Discord
        </button>
      </div>
    </div>
  )
}