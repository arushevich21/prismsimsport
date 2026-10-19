'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function Apply() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ improve: '', goals: '', experience: '', car_series: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return }

      const { data: member } = await supabase
        .from('members')
        .select('active')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (member?.active) { router.replace('/dashboard'); return }

      const { data: inquiry } = await supabase
        .from('inquiries')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (inquiry) { router.replace('/pending'); return }

      setUser(data.user)
    })
  }, [])

  if (!user) return null

  const discordHandle =
    user.user_metadata?.user_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  const canSubmit = !submitting && form.improve.trim() && form.goals.trim() && form.experience.trim()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          discord_handle: discordHandle,
          ...form,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Something went wrong. Please try again.')
      } else {
        router.push('/pending')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const gridBg = {
    position: 'absolute', inset: 0, zIndex: 0,
    background: `
      repeating-linear-gradient(90deg, transparent, transparent 119px, rgba(255,255,255,0.02) 119px, rgba(255,255,255,0.02) 120px),
      repeating-linear-gradient(0deg, transparent, transparent 119px, rgba(255,255,255,0.02) 119px, rgba(255,255,255,0.02) 120px)
    `,
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--dark)',
      padding: '120px 48px 80px', position: 'relative',
    }}>
      <div style={gridBg} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px', margin: '0 auto' }}>

        <button
          onClick={() => router.push('/')}
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
          Back to home
        </button>

        <div style={{
          fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
          textTransform: 'uppercase', color: 'var(--red)',
          marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ width: '24px', height: '1px', background: 'var(--red)', display: 'block' }} />
          Coaching
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 6vw, 64px)',
          letterSpacing: '3px', color: 'var(--off-white)',
          lineHeight: 0.95, marginBottom: '12px',
        }}>APPLY FOR<br /><span style={{ color: 'var(--red)' }}>COACHING</span></h1>

        <p style={{
          fontSize: '14px', fontWeight: 300, color: 'var(--text-muted)',
          lineHeight: 1.7, marginBottom: '48px', maxWidth: '480px',
        }}>
          Tell us about your current level and what you&apos;re looking to achieve. We&apos;ll review your application and reach out via Discord.
        </p>

        <form onSubmit={handleSubmit}>

          {/* Discord handle — read-only */}
          <div style={{ marginBottom: '2px' }}>
            <FieldLabel label="Discord Handle" />
            <input
              type="text"
              value={discordHandle}
              readOnly
              style={{
                width: '100%', padding: '14px 16px',
                background: 'var(--dark-4)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--text-muted)', fontSize: '14px',
                fontFamily: 'var(--font-body)', fontWeight: 300,
                outline: 'none', cursor: 'default',
              }}
            />
          </div>

          <TextareaField
            label="What do you want to improve?"
            required
            value={form.improve}
            onChange={set('improve')}
            placeholder="e.g. Qualifying pace, consistency under pressure, wet weather technique..."
            rows={3}
          />

          <TextareaField
            label="What are you hoping to get out of coaching?"
            required
            value={form.goals}
            onChange={set('goals')}
            placeholder="e.g. Competitive laptimes in ranked lobbies, prep for a specific event..."
            rows={3}
          />

          <TextareaField
            label="Current rank / pace / sim experience"
            required
            value={form.experience}
            onChange={set('experience')}
            placeholder="e.g. iRating 2400, 3 years on ACC, fastest in my league but struggling to crack top split..."
            rows={3}
          />

          <TextareaField
            label="Which car or series do you race?"
            value={form.car_series}
            onChange={set('car_series')}
            placeholder="e.g. GT3, Porsche Cup, Formula 4, LMP2..."
            rows={2}
          />

          {error && (
            <div style={{
              fontSize: '13px', color: 'var(--red)',
              marginBottom: '16px', fontWeight: 300,
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '16px',
              background: canSubmit ? 'var(--red)' : 'var(--dark-4)',
              color: canSubmit ? 'var(--off-white)' : 'var(--text-muted)',
              border: 'none', fontSize: '13px', fontWeight: 500,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-body)', transition: 'all 0.2s',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>

        </form>
      </div>
    </div>
  )
}

function FieldLabel({ label, required }) {
  return (
    <div style={{
      fontSize: '10px', fontWeight: 500, letterSpacing: '2.5px',
      textTransform: 'uppercase', color: 'var(--text-muted)',
      marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      {label}
      {required && <span style={{ color: 'var(--red)', fontSize: '14px', lineHeight: 1 }}>*</span>}
    </div>
  )
}

function TextareaField({ label, required, value, onChange, placeholder, rows }) {
  return (
    <div style={{ marginBottom: '2px' }}>
      <FieldLabel label={label} required={required} />
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        style={{
          width: '100%', padding: '14px 16px',
          background: 'var(--dark-3)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--off-white)', fontSize: '14px',
          fontFamily: 'var(--font-body)', fontWeight: 300,
          resize: 'vertical', outline: 'none', lineHeight: 1.6,
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
      />
    </div>
  )
}
