'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()


const ADMIN_USER_ID = 'eb1671b9-ea44-4681-8b7b-632344e16381'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [showGreeting, setShowGreeting] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return }

      const { data: member } = await supabase
        .from('members')
        .select('active')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (member?.active) {
        setUser(data.user)
        setTimeout(() => setShowGreeting(true), 100)
        setTimeout(() => setShowOptions(true), 1600)
        return
      }

      // Not active — check if they've submitted an application
      const { data: inquiry } = await supabase
        .from('inquiries')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle()

      router.replace(inquiry ? '/pending' : '/apply')
    })
  }, [])

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.name?.split(' ')[0]
    || null

  const memberOptions = [
    {
      label: 'Video Library',
      desc: 'Access your coaching videos and track guides',
      href: '/library',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      ),
    },
    {
      label: 'Book a Session',
      desc: 'Schedule your next 1-on-1 coaching session',
      href: '/schedule',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      label: 'Upload Telemetry',
      desc: 'Send your .rpy lap files to your coach for review',
      href: '/telemetry',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
    },
    {
      label: 'Setup Library',
      desc: 'Download coach-curated setup files for your car and track',
      href: '/setups',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M12 18v-6" />
          <path d="M9 15l3 3 3-3" />
        </svg>
      ),
    },
  ]

  if (!user) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--dark)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `
          repeating-linear-gradient(90deg, transparent, transparent 119px, rgba(255,255,255,0.02) 119px, rgba(255,255,255,0.02) 120px),
          repeating-linear-gradient(0deg, transparent, transparent 119px, rgba(255,255,255,0.02) 119px, rgba(255,255,255,0.02) 120px)
        `,
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '680px' }}>

        <div style={{
          textAlign: 'center',
          marginBottom: '64px',
          opacity: showGreeting ? 1 : 0,
          transform: showGreeting ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}>
          <div style={{
            fontSize: '12px', fontWeight: 500, letterSpacing: '3px',
            textTransform: 'uppercase', color: 'var(--red)', marginBottom: '16px',
          }}>DTS Academy</div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 7vw, 80px)',
            letterSpacing: '4px', color: 'var(--off-white)',
            lineHeight: 1, marginBottom: '12px',
          }}>
            {firstName ? 'WELCOME BACK,' : 'WELCOME BACK'}
          </h1>

          {firstName && (
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(48px, 7vw, 80px)',
              letterSpacing: '4px', color: 'var(--red)',
              lineHeight: 1, marginBottom: '12px',
            }}>{firstName.toUpperCase()}.</h1>
          )}

          <p style={{
            fontSize: '14px', fontWeight: 300,
            color: 'var(--text-muted)', letterSpacing: '0.5px',
          }}>{user.email}</p>
        </div>

        <div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '2px', marginBottom: '2px',
              opacity: showOptions ? 1 : 0,
              transform: showOptions ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}>
              {memberOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => router.push(opt.href)}
                  style={{
                    background: 'var(--dark-3)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '28px 32px', textAlign: 'left',
                    cursor: 'pointer', display: 'flex',
                    flexDirection: 'column', gap: '12px',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--dark-4)'
                    e.currentTarget.style.borderColor = 'rgba(232,25,44,0.3)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--dark-3)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                  }}
                >
                  <div style={{ color: 'var(--red)' }}>{opt.icon}</div>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '22px',
                      letterSpacing: '2px', color: 'var(--off-white)', marginBottom: '6px',
                    }}>{opt.label.toUpperCase()}</div>
                    <div style={{
                      fontSize: '13px', fontWeight: 300,
                      color: 'var(--text-muted)', lineHeight: 1.5,
                    }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => router.push('/members')}
              style={{
                width: '100%', background: 'var(--dark-3)',
                border: '1px solid rgba(232,25,44,0.2)',
                borderTop: '2px solid var(--red)',
                padding: '32px 40px', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                opacity: showOptions ? 1 : 0,
                transform: showOptions ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s, background 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--dark-4)'
                e.currentTarget.style.borderColor = 'rgba(232,25,44,0.5)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--dark-3)'
                e.currentTarget.style.borderColor = 'rgba(232,25,44,0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ color: 'var(--red)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                </div>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '28px',
                    letterSpacing: '3px', color: 'var(--off-white)', marginBottom: '4px',
                  }}>MEMBER DASHBOARD</div>
                  <div style={{ fontSize: '13px', fontWeight: 300, color: 'var(--text-muted)' }}>
                    Your personalised hub — progress, notes, and more
                  </div>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                color: 'var(--red)', fontSize: '12px', fontWeight: 500,
                letterSpacing: '2px', textTransform: 'uppercase', flexShrink: 0,
              }}>
                Enter
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="13,6 19,12 13,18" />
                </svg>
              </div>
            </button>
          </div>

        {user.id === ADMIN_USER_ID && (
          <button
            onClick={() => router.push('/admin')}
            style={{
              width: '100%', marginTop: '2px',
              background: 'var(--dark-2)',
              border: '1px solid rgba(232,25,44,0.15)',
              borderLeft: '3px solid var(--red)',
              padding: '14px 20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              opacity: showOptions ? 1 : 0,
              transition: 'opacity 0.7s ease 0.2s, background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--dark-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--dark-2)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontSize: '9px', fontWeight: 500, letterSpacing: '2.5px',
                  textTransform: 'uppercase', color: 'var(--red)',
                  marginBottom: '1px',
                }}>Admin Access</div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '15px',
                  letterSpacing: '2px', color: 'var(--off-white)',
                }}>Admin Panel</div>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="13,6 19,12 13,18" />
            </svg>
          </button>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', color: 'var(--text-muted)',
              letterSpacing: '1.5px', textTransform: 'uppercase',
              fontFamily: 'var(--font-body)',
              opacity: showOptions ? 1 : 0,
              transition: 'opacity 0.7s ease 0.2s, color 0.2s',
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