'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function Members() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [member, setMember] = useState(null)
  const [sessions, setSessions] = useState([])
  const [uploads, setUploads] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [questionText, setQuestionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return }

      const { data: memberRow } = await supabase
        .from('members')
        .select('active, discord_thread_id')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (!memberRow?.active) { router.replace('/dashboard'); return }

      setUser(data.user)
      setMember(memberRow)

      const [sessionsRes, uploadsRes, questionsRes] = await Promise.all([
        supabase.from('session_videos').select('*').eq('user_id', data.user.id).order('created_at', { ascending: false }),
        supabase.from('telemetry_uploads').select('*').eq('user_id', data.user.id).order('created_at', { ascending: false }),
        supabase.from('questions').select('*').eq('user_id', data.user.id).order('created_at', { ascending: false }),
      ])

      if (sessionsRes.data) setSessions(sessionsRes.data)
      if (uploadsRes.data) setUploads(uploadsRes.data)
      if (questionsRes.data) setQuestions(questionsRes.data)
      setLoading(false)
    })
  }, [])

  const handleQuestionSubmit = async (e) => {
    e.preventDefault()
    if (!questionText.trim()) return
    setSubmitting(true)
    setSubmitError(null)

    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        question: questionText.trim(),
        discord_thread_id: member?.discord_thread_id || null,
        user_email: user.email,
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      setSubmitError(result.error || 'Failed to submit. Please try again.')
      setSubmitting(false)
      return
    }

    setQuestions(q => [result.question, ...q])
    setQuestionText('')
    setSubmitSuccess(true)
    setSubmitting(false)
    setTimeout(() => setSubmitSuccess(false), 4000)
  }

  if (loading || !user) return null

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.name?.split(' ')[0]
    || null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', position: 'relative' }}>
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

        {/* Page heading */}
        <div style={{ marginBottom: '64px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
            textTransform: 'uppercase', color: 'var(--red)',
            marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ width: '24px', height: '1px', background: 'var(--red)', display: 'block' }} />
            Member Area
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 6vw, 72px)',
            letterSpacing: '4px', color: 'var(--off-white)',
            lineHeight: 0.92, marginBottom: '16px',
          }}>
            {firstName ? `${firstName.toUpperCase()}'S` : 'YOUR'}<br />
            <span style={{ color: 'var(--red)' }}>DASHBOARD</span>
          </h1>
          <p style={{
            fontSize: '14px', fontWeight: 300, color: 'var(--text-muted)',
            lineHeight: 1.7, maxWidth: '480px',
          }}>
            Your personal coaching hub — session recordings, telemetry feedback, and direct access to your coach.
          </p>
        </div>

        {/* ─── MY SESSIONS ─── */}
        <SectionHeader
          label="Recordings"
          title="MY SESSIONS"
          count={sessions.length}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          }
        />

        {sessions.length === 0 ? (
          <EmptyState>Your recorded sessions will appear here after your first coaching session.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '64px' }}>
            {sessions.map(s => (
              <div key={s.id} style={{
                background: 'var(--dark-3)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderLeft: '3px solid rgba(232,25,44,0.4)',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '20px',
                    letterSpacing: '2px', color: 'var(--off-white)', marginBottom: '4px',
                  }}>{s.title.toUpperCase()}</div>
                  {s.session_date && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                      {new Date(s.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${s.youtube_id}`}
                    style={{
                      position: 'absolute', top: 0, left: 0,
                      width: '100%', height: '100%', border: 'none', display: 'block',
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={s.title}
                  />
                </div>
                {s.notes && (
                  <div style={{
                    padding: '20px 24px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '13px', fontWeight: 300,
                    color: 'var(--text-muted)', lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}>{s.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── TELEMETRY FEEDBACK ─── */}
        <SectionHeader
          label="Data"
          title="TELEMETRY FEEDBACK"
          count={uploads.length}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />

        {uploads.length === 0 ? (
          <EmptyState>Upload telemetry files from the dashboard to receive coach feedback here.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '64px' }}>
            {uploads.map(u => {
              const hasFeedback = u.feedback?.trim()
              const statusLabel = hasFeedback ? 'Feedback Ready' : u.reviewed ? 'Reviewed' : 'Pending Review'
              const statusColor = hasFeedback ? 'var(--red)' : u.reviewed ? '#6fcf97' : 'var(--text-muted)'
              const statusBorder = hasFeedback ? 'rgba(232,25,44,0.3)' : u.reviewed ? 'rgba(111,207,151,0.3)' : 'rgba(255,255,255,0.1)'
              return (
                <div key={u.id} style={{
                  background: 'var(--dark-3)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: hasFeedback ? '3px solid var(--red)' : '3px solid rgba(255,255,255,0.08)',
                  padding: '20px 24px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: hasFeedback ? '16px' : 0 }}>
                    <div>
                      <div style={{
                        fontFamily: 'var(--font-display)', fontSize: '18px',
                        letterSpacing: '2px', color: 'var(--off-white)', marginBottom: '6px',
                      }}>{u.filename}</div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 500, letterSpacing: '1.5px',
                          textTransform: 'uppercase', color: statusColor,
                          border: `1px solid ${statusBorder}`, padding: '3px 8px',
                        }}>{statusLabel}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {hasFeedback && (
                    <div style={{
                      background: 'var(--dark-2)',
                      border: '1px solid rgba(232,25,44,0.15)',
                      borderLeft: '2px solid var(--red)',
                      padding: '14px 16px',
                      fontSize: '13px', fontWeight: 300,
                      color: 'var(--cream)', lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                    }}>{u.feedback}</div>
                  )}
                  {u.note && !hasFeedback && (
                    <div style={{
                      marginTop: '10px',
                      fontSize: '12px', fontWeight: 300,
                      color: 'var(--text-muted)', lineHeight: 1.6,
                    }}>Note: {u.note}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ─── ASK YOUR COACH ─── */}
        <SectionHeader
          label="Questions"
          title="ASK YOUR COACH"
          count={questions.length || null}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          }
        />

        <div style={{ marginBottom: '64px' }}>
          <form onSubmit={handleQuestionSubmit} style={{ marginBottom: '24px' }}>
            <div style={{
              background: 'var(--dark-3)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderTop: '2px solid var(--red)',
              padding: '24px',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: 500, letterSpacing: '2px',
                textTransform: 'uppercase', color: 'var(--text-muted)',
                marginBottom: '12px',
              }}>Your question</div>
              <textarea
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                placeholder="Ask about technique, setup, strategy, or anything else on your mind..."
                rows={4}
                style={{
                  width: '100%', background: 'var(--dark-2)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--cream)', padding: '14px 16px',
                  fontSize: '14px', fontWeight: 300, lineHeight: 1.6,
                  fontFamily: 'var(--font-body)', resize: 'vertical',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              {submitError && (
                <div style={{
                  marginTop: '8px', fontSize: '12px',
                  color: 'var(--red)', fontWeight: 300,
                }}>{submitError}</div>
              )}
              {submitSuccess && (
                <div style={{
                  marginTop: '8px', fontSize: '12px',
                  color: '#6fcf97', fontWeight: 300, letterSpacing: '0.5px',
                }}>Question sent — your coach will reply soon.</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="submit"
                  disabled={submitting || !questionText.trim()}
                  style={{
                    background: submitting || !questionText.trim() ? 'var(--dark-4)' : 'var(--red)',
                    color: submitting || !questionText.trim() ? 'var(--text-muted)' : 'var(--off-white)',
                    border: 'none', padding: '13px 28px',
                    fontSize: '11px', fontWeight: 500, letterSpacing: '2px',
                    textTransform: 'uppercase', fontFamily: 'var(--font-body)',
                    cursor: submitting || !questionText.trim() ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseEnter={e => { if (!submitting && questionText.trim()) e.currentTarget.style.background = 'var(--red-dim)' }}
                  onMouseLeave={e => { if (!submitting && questionText.trim()) e.currentTarget.style.background = 'var(--red)' }}
                >
                  {submitting ? 'Sending...' : 'Send Question'}
                </button>
              </div>
            </div>
          </form>

          {questions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {questions.map(q => {
                const answered = q.status === 'answered'
                return (
                  <div key={q.id} style={{
                    background: 'var(--dark-3)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderLeft: answered ? '3px solid #6fcf97' : '3px solid rgba(255,255,255,0.08)',
                    padding: '18px 24px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{
                        fontSize: '14px', fontWeight: 300,
                        color: 'var(--cream)', lineHeight: 1.6, flex: 1,
                      }}>{q.question}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 500, letterSpacing: '1.5px',
                          textTransform: 'uppercase',
                          color: answered ? '#6fcf97' : 'var(--text-muted)',
                          border: `1px solid ${answered ? 'rgba(111,207,151,0.3)' : 'rgba(255,255,255,0.1)'}`,
                          padding: '3px 8px',
                        }}>{answered ? 'Answered' : 'Open'}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(q.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function SectionHeader({ label, title, count, icon }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
        textTransform: 'uppercase', color: 'var(--text-muted)',
        marginBottom: '10px',
      }}>
        <span style={{ color: 'var(--red)' }}>{icon}</span>
        {label}
        {count != null && count > 0 && (
          <span style={{
            marginLeft: '4px', fontSize: '10px',
            color: 'var(--red)', fontWeight: 500,
          }}>({count})</span>
        )}
      </div>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 44px)',
        letterSpacing: '3px', color: 'var(--off-white)',
        lineHeight: 1, marginBottom: '20px',
      }}>{title}</h2>
    </div>
  )
}

function EmptyState({ children }) {
  return (
    <div style={{
      background: 'var(--dark-3)',
      border: '1px solid rgba(255,255,255,0.05)',
      padding: '48px 32px', textAlign: 'center',
      color: 'var(--text-muted)', fontSize: '14px', fontWeight: 300,
      lineHeight: 1.7, marginBottom: '64px',
    }}>{children}</div>
  )
}
