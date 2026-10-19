'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function Library() {
  const router = useRouter()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTrack, setFilterTrack] = useState('')
  const [filterCar, setFilterCar] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return }

      const { data: member } = await supabase
        .from('members')
        .select('active')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (!member?.active) { router.replace('/dashboard'); return }

      const { data: vids } = await supabase
        .from('videos')
        .select('*')
        .order('sort_order')

      if (vids) setVideos(vids)
      setLoading(false)
    })
  }, [])

  // Derive filter options from fetched data
  const tracks     = [...new Set(videos.map(v => v.track).filter(Boolean))].sort()
  const cars       = [...new Set(videos.map(v => v.car).filter(Boolean))].sort()
  const categories = [...new Set(videos.map(v => v.category).filter(Boolean))].sort()

  const filtered = videos.filter(v => {
    if (filterTrack    && v.track    !== filterTrack)    return false
    if (filterCar      && v.car      !== filterCar)      return false
    if (filterCategory && v.category !== filterCategory) return false
    return true
  })

  const hasFilters = filterTrack || filterCar || filterCategory

  const handleCardClick = (video) => {
    setSelected(prev => prev?.id === video.id ? null : video)
    // Scroll the player into view after state update
    setTimeout(() => document.getElementById('library-player')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  if (loading) return null

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--dark)',
      padding: '120px 48px 80px', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `
          repeating-linear-gradient(90deg, transparent, transparent 119px, rgba(255,255,255,0.02) 119px, rgba(255,255,255,0.02) 120px),
          repeating-linear-gradient(0deg, transparent, transparent 119px, rgba(255,255,255,0.02) 119px, rgba(255,255,255,0.02) 120px)
        `,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto' }}>

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
            Library
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: '3px', color: 'var(--off-white)',
            lineHeight: 0.95, marginBottom: '12px',
          }}>
            VIDEO<br /><span style={{ color: 'var(--red)' }}>LIBRARY</span>
          </h1>
          <p style={{
            fontSize: '14px', fontWeight: 300, color: 'var(--text-muted)',
            lineHeight: 1.7, maxWidth: '480px',
          }}>
            Hot laps, track guides, and coaching breakdowns. Click any video to watch it here.
          </p>
        </div>

        {/* Filter bar */}
        <div style={{
          display: 'flex', gap: '6px', marginBottom: '32px',
          alignItems: 'center', flexWrap: 'wrap',
        }}>
          <FilterSelect
            placeholder="All Tracks"
            value={filterTrack}
            onChange={setFilterTrack}
            options={tracks}
          />
          <FilterSelect
            placeholder="All Cars"
            value={filterCar}
            onChange={setFilterCar}
            options={cars}
          />
          <FilterSelect
            placeholder="All Categories"
            value={filterCategory}
            onChange={setFilterCategory}
            options={categories}
          />
          {hasFilters && (
            <button
              onClick={() => { setFilterTrack(''); setFilterCar(''); setFilterCategory('') }}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-muted)', padding: '8px 14px', cursor: 'pointer',
                fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
                textTransform: 'uppercase', fontFamily: 'var(--font-body)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--cream)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
            >
              Clear
            </button>
          )}
          <div style={{
            marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)',
            letterSpacing: '1px',
          }}>
            {filtered.length} video{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Inline player — shown when a video is selected */}
        {selected && (
          <div id="library-player" style={{
            background: 'var(--dark-3)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderTop: '2px solid var(--red)',
            marginBottom: '2px',
            display: 'grid',
            gridTemplateColumns: '3fr 2fr',
          }}>
            {/* YouTube embed */}
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                key={selected.id}
                src={`https://www.youtube.com/embed/${selected.youtube_id}?autoplay=1&rel=0`}
                title={selected.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  border: 'none', display: 'block',
                }}
              />
            </div>

            {/* Video info */}
            <div style={{
              padding: '32px 28px',
              display: 'flex', flexDirection: 'column',
              borderLeft: '1px solid rgba(255,255,255,0.05)',
              overflow: 'hidden',
            }}>
              <div style={{ flex: 1 }}>
                {selected.category && (
                  <div style={{
                    display: 'inline-block', marginBottom: '12px',
                    fontSize: '10px', fontWeight: 500, letterSpacing: '2px',
                    textTransform: 'uppercase', color: 'var(--red)',
                    border: '1px solid rgba(232,25,44,0.3)',
                    padding: '3px 10px',
                  }}>
                    {selected.category}
                  </div>
                )}

                <h2 style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 2.5vw, 32px)',
                  letterSpacing: '2px', color: 'var(--off-white)',
                  lineHeight: 1.05, marginBottom: '16px',
                }}>
                  {selected.title.toUpperCase()}
                </h2>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {selected.track && <Tag>{selected.track}</Tag>}
                  {selected.car && <Tag>{selected.car}</Tag>}
                </div>

                {selected.description && (
                  <p style={{
                    fontSize: '13px', fontWeight: 300, color: 'var(--cream)',
                    lineHeight: 1.7,
                  }}>
                    {selected.description}
                  </p>
                )}
              </div>

              <button
                onClick={() => setSelected(null)}
                style={{
                  marginTop: '24px', alignSelf: 'flex-start',
                  background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-muted)', padding: '8px 16px', cursor: 'pointer',
                  fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
                  textTransform: 'uppercase', fontFamily: 'var(--font-body)',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'var(--cream)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Video grid */}
        {filtered.length === 0 ? (
          <div style={{
            background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.05)',
            padding: '64px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: '14px', fontWeight: 300,
          }}>
            {videos.length === 0 ? 'No videos yet — check back soon.' : 'No videos match your filters.'}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2px',
          }}>
            {filtered.map(video => (
              <button
                key={video.id}
                onClick={() => handleCardClick(video)}
                style={{
                  background: 'var(--dark-3)',
                  border: `1px solid ${selected?.id === video.id ? 'rgba(232,25,44,0.4)' : 'rgba(255,255,255,0.05)'}`,
                  borderTop: `2px solid ${selected?.id === video.id ? 'var(--red)' : 'transparent'}`,
                  padding: 0, cursor: 'pointer', textAlign: 'left',
                  display: 'flex', flexDirection: 'column',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => {
                  if (selected?.id !== video.id) {
                    e.currentTarget.style.borderColor = 'rgba(232,25,44,0.25)'
                    e.currentTarget.style.borderTopColor = 'rgba(232,25,44,0.25)'
                  }
                }}
                onMouseLeave={e => {
                  if (selected?.id !== video.id) {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.borderTopColor = 'transparent'
                  }
                }}
              >
                {/* Thumbnail */}
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                  <img
                    src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
                    alt={video.title}
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%',
                      objectFit: 'cover', display: 'block',
                    }}
                  />
                  {/* Play overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(13,12,11,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: selected?.id === video.id ? 0 : 1,
                    transition: 'opacity 0.2s',
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'rgba(232,25,44,0.85)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '16px 18px 20px' }}>
                  {video.category && (
                    <div style={{
                      display: 'inline-block', marginBottom: '8px',
                      fontSize: '9px', fontWeight: 500, letterSpacing: '2px',
                      textTransform: 'uppercase', color: 'var(--red)',
                      border: '1px solid rgba(232,25,44,0.3)', padding: '2px 8px',
                    }}>
                      {video.category}
                    </div>
                  )}
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '18px',
                    letterSpacing: '1.5px', color: 'var(--off-white)',
                    lineHeight: 1.1, marginBottom: '10px',
                  }}>
                    {video.title.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {video.track && <Tag small>{video.track}</Tag>}
                    {video.car && <Tag small>{video.car}</Tag>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Tag({ children, small }) {
  return (
    <span style={{
      display: 'inline-block',
      border: '1px solid rgba(255,255,255,0.1)',
      color: 'var(--text-muted)',
      fontSize: small ? '9px' : '10px',
      fontWeight: 500, letterSpacing: '1.5px',
      textTransform: 'uppercase',
      padding: small ? '2px 7px' : '3px 10px',
      fontFamily: 'var(--font-body)',
    }}>
      {children}
    </span>
  )
}

const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237A756D' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`

function FilterSelect({ placeholder, value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: 'var(--dark-3)',
        color: value ? 'var(--off-white)' : 'var(--text-muted)',
        border: `1px solid ${value ? 'rgba(232,25,44,0.35)' : 'rgba(255,255,255,0.08)'}`,
        padding: '8px 32px 8px 12px', cursor: 'pointer',
        fontSize: '11px', fontWeight: 500, letterSpacing: '2px',
        textTransform: 'uppercase', fontFamily: 'var(--font-body)',
        outline: 'none',
        appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
        backgroundImage: selectChevron,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        transition: 'border-color 0.2s, color 0.2s',
        minWidth: '140px',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}
