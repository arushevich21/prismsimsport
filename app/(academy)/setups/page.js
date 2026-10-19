'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function Setups() {
  const router = useRouter()
  const [setups, setSetups] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTrack, setFilterTrack] = useState('')
  const [filterCar, setFilterCar] = useState('')
  const [filterType, setFilterType] = useState('')
  const [downloading, setDownloading] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return }

      const { data: member } = await supabase
        .from('members')
        .select('active')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (!member?.active) { router.replace('/dashboard'); return }

      const { data: rows } = await supabase
        .from('setups')
        .select('*')
        .order('sort_order', { ascending: true })

      if (rows) setSetups(rows)
      setLoading(false)
    })
  }, [])

  const tracks = [...new Set(setups.map(s => s.track).filter(Boolean))].sort()
  const cars = [...new Set(setups.map(s => s.car).filter(Boolean))].sort()
  const types = [...new Set(setups.map(s => s.setup_type).filter(Boolean))].sort()

  const filtered = setups.filter(s => {
    if (filterTrack && s.track !== filterTrack) return false
    if (filterCar && s.car !== filterCar) return false
    if (filterType && s.setup_type !== filterType) return false
    return true
  })

  const handleDownload = async (setup) => {
    setDownloading(setup.id)
    const { data, error } = await supabase.storage
      .from('setups')
      .createSignedUrl(setup.storage_path, 60)
    if (error) { alert('Download failed: ' + error.message); setDownloading(null); return }
    const a = document.createElement('a')
    a.href = data.signedUrl
    a.download = setup.filename
    a.click()
    setDownloading(null)
  }

  const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237A756D' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`

  const selectStyle = {
    background: 'var(--dark-3)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--cream)',
    padding: '10px 32px 10px 14px',
    fontSize: '11px', fontWeight: 500,
    letterSpacing: '2px', textTransform: 'uppercase',
    fontFamily: 'var(--font-body)', outline: 'none',
    cursor: 'pointer',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: chevron,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
  }

  if (loading) return null

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--dark)',
      padding: '80px 48px', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `
          repeating-linear-gradient(90deg, transparent, transparent 119px, rgba(255,255,255,0.02) 119px, rgba(255,255,255,0.02) 120px),
          repeating-linear-gradient(0deg, transparent, transparent 119px, rgba(255,255,255,0.02) 119px, rgba(255,255,255,0.02) 120px)
        `,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' }}>

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
        <div style={{ marginBottom: '40px' }}>
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
            SETUP<br /><span style={{ color: 'var(--red)' }}>LIBRARY</span>
          </h1>
          <p style={{
            fontSize: '14px', fontWeight: 300, color: 'var(--text-muted)',
            lineHeight: 1.7, maxWidth: '480px',
          }}>
            Coach-curated setup files for your car and track combination. Download and load directly into your sim.
          </p>
        </div>

        {/* Filter bar */}
        {setups.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <select value={filterTrack} onChange={e => setFilterTrack(e.target.value)} style={selectStyle}>
              <option value="">All Tracks</option>
              {tracks.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterCar} onChange={e => setFilterCar(e.target.value)} style={selectStyle}>
              <option value="">All Cars</option>
              {cars.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
              <option value="">All Types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {(filterTrack || filterCar || filterType) && (
              <button
                onClick={() => { setFilterTrack(''); setFilterCar(''); setFilterType('') }}
                style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-muted)', padding: '10px 16px',
                  fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase',
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--cream)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Setup list */}
        {filtered.length === 0 ? (
          <div style={{
            background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.05)',
            padding: '64px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: '14px', fontWeight: 300,
          }}>
            {setups.length === 0 ? 'No setups available yet' : 'No setups match your filters'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filtered.map(s => (
              <div key={s.id} style={{
                background: 'var(--dark-3)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderLeft: '3px solid rgba(232,25,44,0.4)',
                padding: '24px 28px',
                display: 'flex', alignItems: 'center', gap: '24px',
              }}>
                {/* File icon */}
                <div style={{ color: 'var(--red)', flexShrink: 0 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '24px',
                    letterSpacing: '2px', color: 'var(--off-white)',
                    marginBottom: '8px',
                  }}>{s.title.toUpperCase()}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: s.description ? '10px' : 0 }}>
                    {s.track && <SetupTag label={s.track} />}
                    {s.car && <SetupTag label={s.car} />}
                    {s.setup_type && <SetupTag label={s.setup_type} accent />}
                  </div>
                  {s.description && (
                    <div style={{
                      fontSize: '13px', fontWeight: 300,
                      color: 'var(--text-muted)', lineHeight: 1.6,
                    }}>{s.description}</div>
                  )}
                </div>

                {/* Download */}
                <button
                  onClick={() => handleDownload(s)}
                  disabled={downloading === s.id}
                  style={{
                    background: downloading === s.id ? 'var(--dark-4)' : 'var(--red)',
                    color: downloading === s.id ? 'var(--text-muted)' : 'var(--off-white)',
                    border: 'none', padding: '13px 24px',
                    fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
                    textTransform: 'uppercase', cursor: downloading === s.id ? 'wait' : 'pointer',
                    fontFamily: 'var(--font-body)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    flexShrink: 0, transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => { if (downloading !== s.id) e.currentTarget.style.background = 'var(--red-dim)' }}
                  onMouseLeave={e => { if (downloading !== s.id) e.currentTarget.style.background = 'var(--red)' }}
                >
                  {downloading === s.id ? 'Preparing...' : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SetupTag({ label, accent }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 500, letterSpacing: '1.5px',
      textTransform: 'uppercase',
      color: accent ? 'var(--red)' : 'var(--text-muted)',
      border: `1px solid ${accent ? 'rgba(232,25,44,0.3)' : 'rgba(255,255,255,0.1)'}`,
      padding: '3px 8px',
    }}>{label}</span>
  )
}
