'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

const ADMIN_USER_ID = 'eb1671b9-ea44-4681-8b7b-632344e16381'
const TIERS = ['pending', 'student', 'driver', 'elite']
const BLANK_VIDEO = { youtube_url: '', title: '', track: '', car: '', category: '', description: '', sort_order: '' }
const BLANK_SETUP = { title: '', track: '', car: '', setup_type: '', description: '', sort_order: '' }
const BLANK_SESSION = { user_id: '', youtube_url: '', title: '', session_date: '', notes: '' }
const SETUP_TYPES = ['qualifying', 'race', 'wet', 'stable', 'pointy']

function parseYoutubeId(url) {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#/]+)/,
    /\/embed\/([^?&#/]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1].trim()
  }
  return null
}

export default function Admin() {
  const router = useRouter()
  const [tab, setTab] = useState('telemetry')
  const [uploads, setUploads] = useState([])
  const [members, setMembers] = useState([])
  const [videos, setVideos] = useState([])
  const [setups, setSetups] = useState([])
  const [sessionVideos, setSessionVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  // video form state
  const [videoForm, setVideoForm] = useState(BLANK_VIDEO)
  const [editingVideo, setEditingVideo] = useState(null)
  const [deleteVideoConfirm, setDeleteVideoConfirm] = useState(null)
  const [videoSubmitting, setVideoSubmitting] = useState(false)
  const [videoError, setVideoError] = useState('')

  // setup form state
  const [setupFile, setSetupFile] = useState(null)
  const [setupForm, setSetupForm] = useState(BLANK_SETUP)
  const [editingSetup, setEditingSetup] = useState(null)
  const [deleteSetupConfirm, setDeleteSetupConfirm] = useState(null)
  const [setupSubmitting, setSetupSubmitting] = useState(false)
  const [setupError, setSetupError] = useState('')

  // session form state
  const [sessionForm, setSessionForm] = useState(BLANK_SESSION)
  const [sessionSubmitting, setSessionSubmitting] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [deleteSessionConfirm, setDeleteSessionConfirm] = useState(null)

  // inline feedback per telemetry upload (write buffer)
  const [feedbackValues, setFeedbackValues] = useState({})
  const [feedbackSaving, setFeedbackSaving] = useState({})

  // inline discord thread id per member (write buffer)
  const [threadIdValues, setThreadIdValues] = useState({})
  const [threadIdSaving, setThreadIdSaving] = useState({})

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user || data.user.id !== ADMIN_USER_ID) {
        router.push('/')
      } else {
        Promise.all([fetchAllUploads(), fetchAllMembers(), fetchAllVideos(), fetchAllSetups(), fetchAllSessionVideos()])
          .then(() => setLoading(false))
      }
    })
  }, [])

  // ── fetchers ──

  const fetchAllUploads = async () => {
    const { data } = await supabase
      .from('telemetry_uploads')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setUploads(data)
  }

  const fetchAllMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setMembers(data)
  }

  const fetchAllVideos = async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('sort_order', { ascending: true })
    if (data) setVideos(data)
  }

  const fetchAllSetups = async () => {
    const { data } = await supabase
      .from('setups')
      .select('*')
      .order('sort_order', { ascending: true })
    if (data) setSetups(data)
  }

  const fetchAllSessionVideos = async () => {
    const { data } = await supabase
      .from('session_videos')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setSessionVideos(data)
  }

  // ── telemetry ──

  const markReviewed = async (id, current) => {
    await supabase.from('telemetry_uploads').update({ reviewed: !current }).eq('id', id)
    fetchAllUploads()
  }

  const downloadFile = async (storagePath, filename) => {
    const { data, error } = await supabase.storage.from('telemetry').createSignedUrl(storagePath, 60)
    if (error) { alert('Download failed: ' + error.message); return }
    const a = document.createElement('a')
    a.href = data.signedUrl
    a.download = filename
    a.click()
  }

  const handleFeedbackSave = async (uploadId) => {
    const text = feedbackValues[uploadId] ?? uploads.find(u => u.id === uploadId)?.feedback ?? ''
    setFeedbackSaving(s => ({ ...s, [uploadId]: true }))
    await supabase
      .from('telemetry_uploads')
      .update({ feedback: text.trim() || null })
      .eq('id', uploadId)
    setFeedbackSaving(s => ({ ...s, [uploadId]: false }))
    setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, feedback: text.trim() || null } : u))
  }

  // ── members ──

  const toggleActive = async (id, current) => {
    await supabase.from('members').update({ active: !current }).eq('id', id)
    fetchAllMembers()
  }

  const updateTier = async (id, tier) => {
    await supabase.from('members').update({ tier }).eq('id', id)
    fetchAllMembers()
  }

  const handleThreadIdSave = async (memberId) => {
    const val = (threadIdValues[memberId] ?? members.find(m => m.id === memberId)?.discord_thread_id ?? '').trim()
    setThreadIdSaving(s => ({ ...s, [memberId]: true }))
    await supabase
      .from('members')
      .update({ discord_thread_id: val || null })
      .eq('id', memberId)
    setThreadIdSaving(s => ({ ...s, [memberId]: false }))
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, discord_thread_id: val || null } : m))
  }

  // ── videos ──

  const handleVideoSubmit = async (e) => {
    e.preventDefault()
    setVideoError('')
    const youtube_id = parseYoutubeId(videoForm.youtube_url)
    if (!youtube_id) { setVideoError('Could not parse a YouTube video ID from that URL.'); return }
    setVideoSubmitting(true)
    const payload = {
      youtube_id,
      title: videoForm.title,
      track: videoForm.track || null,
      car: videoForm.car || null,
      category: videoForm.category || null,
      description: videoForm.description || null,
      sort_order: videoForm.sort_order !== '' ? parseInt(videoForm.sort_order, 10) : null,
    }
    const { error } = editingVideo
      ? await supabase.from('videos').update(payload).eq('id', editingVideo.id)
      : await supabase.from('videos').insert(payload)
    if (error) {
      setVideoError(error.message)
    } else {
      setEditingVideo(null)
      setVideoForm(BLANK_VIDEO)
      await fetchAllVideos()
    }
    setVideoSubmitting(false)
  }

  const startEditVideo = (v) => {
    setEditingVideo(v)
    setVideoError('')
    setDeleteVideoConfirm(null)
    setVideoForm({
      youtube_url: `https://www.youtube.com/watch?v=${v.youtube_id}`,
      title: v.title || '',
      track: v.track || '',
      car: v.car || '',
      category: v.category || '',
      description: v.description || '',
      sort_order: v.sort_order ?? '',
    })
    setTimeout(() => document.getElementById('video-form')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const cancelEditVideo = () => {
    setEditingVideo(null)
    setVideoForm(BLANK_VIDEO)
    setVideoError('')
  }

  const handleDeleteVideo = async (id) => {
    await supabase.from('videos').delete().eq('id', id)
    setDeleteVideoConfirm(null)
    await fetchAllVideos()
  }

  const setVF = (field) => (e) => setVideoForm(f => ({ ...f, [field]: e.target.value }))

  // ── setups ──

  const handleSetupSubmit = async (e) => {
    e.preventDefault()
    if (!editingSetup && !setupFile) { setSetupError('Please select a file.'); return }
    setSetupSubmitting(true)
    setSetupError('')

    let storage_path = editingSetup?.storage_path
    let filename = editingSetup?.filename

    if (setupFile) {
      const path = `${Date.now()}_${setupFile.name}`
      const { error: uploadError } = await supabase.storage.from('setups').upload(path, setupFile)
      if (uploadError) { setSetupError(uploadError.message); setSetupSubmitting(false); return }
      storage_path = path
      filename = setupFile.name
    }

    const payload = {
      title: setupForm.title,
      filename,
      storage_path,
      track: setupForm.track || null,
      car: setupForm.car || null,
      setup_type: setupForm.setup_type || null,
      description: setupForm.description || null,
      sort_order: setupForm.sort_order !== '' ? parseInt(setupForm.sort_order, 10) : 0,
    }

    const { error } = editingSetup
      ? await supabase.from('setups').update(payload).eq('id', editingSetup.id)
      : await supabase.from('setups').insert(payload)

    if (error) {
      if (setupFile && !editingSetup) await supabase.storage.from('setups').remove([storage_path])
      setSetupError(error.message)
    } else {
      if (editingSetup && setupFile && editingSetup.storage_path !== storage_path) {
        await supabase.storage.from('setups').remove([editingSetup.storage_path])
      }
      setEditingSetup(null)
      setSetupForm(BLANK_SETUP)
      setSetupFile(null)
      await fetchAllSetups()
    }
    setSetupSubmitting(false)
  }

  const startEditSetup = (s) => {
    setEditingSetup(s)
    setSetupError('')
    setSetupFile(null)
    setDeleteSetupConfirm(null)
    setSetupForm({
      title: s.title || '',
      track: s.track || '',
      car: s.car || '',
      setup_type: s.setup_type || '',
      description: s.description || '',
      sort_order: s.sort_order ?? '',
    })
    setTimeout(() => document.getElementById('setup-form')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const cancelEditSetup = () => {
    setEditingSetup(null)
    setSetupForm(BLANK_SETUP)
    setSetupFile(null)
    setSetupError('')
  }

  const handleDeleteSetup = async (setup) => {
    await supabase.storage.from('setups').remove([setup.storage_path])
    await supabase.from('setups').delete().eq('id', setup.id)
    setDeleteSetupConfirm(null)
    await fetchAllSetups()
  }

  const setSF = (field) => (e) => setSetupForm(f => ({ ...f, [field]: e.target.value }))

  // ── sessions ──

  const handleSessionSubmit = async (e) => {
    e.preventDefault()
    setSessionError('')
    if (!sessionForm.user_id) { setSessionError('Please select a student.'); return }
    const youtube_id = parseYoutubeId(sessionForm.youtube_url)
    if (!youtube_id) { setSessionError('Could not parse a YouTube video ID from that URL.'); return }
    setSessionSubmitting(true)
    const { error } = await supabase.from('session_videos').insert({
      user_id: sessionForm.user_id,
      youtube_id,
      title: sessionForm.title,
      session_date: sessionForm.session_date || null,
      notes: sessionForm.notes || null,
    })
    if (error) {
      setSessionError(error.message)
    } else {
      setSessionForm(BLANK_SESSION)
      await fetchAllSessionVideos()
    }
    setSessionSubmitting(false)
  }

  const handleDeleteSession = async (id) => {
    await supabase.from('session_videos').delete().eq('id', id)
    setDeleteSessionConfirm(null)
    await fetchAllSessionVideos()
  }

  const setSesF = (field) => (e) => setSessionForm(f => ({ ...f, [field]: e.target.value }))

  // ── misc ──

  const formatDate = (ts) => new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const pendingCount = uploads.filter(u => !u.reviewed).length
  const inactiveCount = members.filter(m => !m.active).length
  const activeMembers = members.filter(m => m.active)
  const memberByUserId = Object.fromEntries(members.map(m => [m.user_id, m]))

  const filtered = uploads.filter(u => {
    if (filter === 'pending') return !u.reviewed
    if (filter === 'reviewed') return u.reviewed
    return true
  })

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    background: 'var(--dark-4)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--off-white)', fontSize: '13px',
    fontFamily: 'var(--font-body)', fontWeight: 300,
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle = {
    fontSize: '10px', fontWeight: 500, letterSpacing: '2.5px',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    display: 'block', marginBottom: '8px',
  }

  const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237A756D' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`

  const selectStyle = {
    ...inputStyle, cursor: 'pointer',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: selectChevron,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: '32px',
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

        {/* Page header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
            textTransform: 'uppercase', color: 'var(--red)',
            marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ width: '24px', height: '1px', background: 'var(--red)', display: 'block' }} />
            Admin Panel
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5vw, 64px)',
            letterSpacing: '3px', color: 'var(--off-white)', lineHeight: 0.95,
          }}>
            DTS <span style={{ color: 'var(--red)' }}>ADMIN</span>
          </h1>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '2px', marginBottom: '48px', flexWrap: 'wrap' }}>
          {[
            { key: 'telemetry', label: 'Telemetry', badge: pendingCount },
            { key: 'members', label: 'Members', badge: inactiveCount },
            { key: 'videos', label: 'Videos', badge: 0 },
            { key: 'setups', label: 'Setups', badge: 0 },
            { key: 'sessions', label: 'Sessions', badge: 0 },
          ].map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                background: tab === key ? 'var(--dark-3)' : 'none',
                border: `1px solid ${tab === key ? 'rgba(232,25,44,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: tab === key ? 'var(--off-white)' : 'var(--text-muted)',
                padding: '10px 28px', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontSize: '20px',
                letterSpacing: '2px', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: '10px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (tab !== key) e.currentTarget.style.color = 'var(--cream)' }}
              onMouseLeave={e => { if (tab !== key) e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              {label}
              {badge > 0 && (
                <span style={{
                  background: 'var(--red)', color: '#fff',
                  fontFamily: 'var(--font-body)', fontSize: '11px',
                  fontWeight: 600, letterSpacing: 0,
                  minWidth: '20px', height: '20px', borderRadius: '10px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 5px',
                }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TELEMETRY TAB ── */}
        {tab === 'telemetry' && (
          <>
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', marginBottom: '48px',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 52px)',
                letterSpacing: '3px', color: 'var(--off-white)', lineHeight: 0.95,
              }}>TELEMETRY<br /><span style={{ color: 'var(--red)' }}>INBOX</span></h2>

              <div style={{ display: 'flex', gap: '2px' }}>
                {[
                  { value: uploads.length, label: 'Total', color: 'var(--off-white)' },
                  { value: pendingCount, label: 'Pending', color: pendingCount > 0 ? '#FFD700' : 'var(--off-white)' },
                  { value: uploads.filter(u => u.reviewed).length, label: 'Reviewed', color: '#4ade80' },
                ].map(({ value, label, color }) => (
                  <div key={label} style={{
                    background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.05)',
                    padding: '20px 28px', textAlign: 'center',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '36px',
                      letterSpacing: '2px', color, lineHeight: 1,
                    }}>{value}</div>
                    <div style={{
                      fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase',
                      color: 'var(--text-muted)', marginTop: '4px',
                    }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2px', marginBottom: '24px' }}>
              {['all', 'pending', 'reviewed'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    background: filter === f ? 'var(--dark-3)' : 'none',
                    border: `1px solid ${filter === f ? 'rgba(232,25,44,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    color: filter === f ? 'var(--off-white)' : 'var(--text-muted)',
                    padding: '8px 20px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 500, letterSpacing: '2px',
                    textTransform: 'uppercase', fontFamily: 'var(--font-body)',
                    transition: 'all 0.2s',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{
                background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.05)',
                padding: '48px', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: '14px', fontWeight: 300,
              }}>
                No uploads found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {filtered.map((u) => (
                  <div key={u.id} style={{
                    background: 'var(--dark-3)',
                    border: `1px solid ${!u.reviewed ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)'}`,
                    borderLeft: `3px solid ${!u.reviewed ? '#FFD700' : '#4ade80'}`,
                    padding: '24px 28px',
                  }}>
                    {/* Top row */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: '24px',
                      marginBottom: '20px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '13px', fontWeight: 400,
                          color: 'var(--off-white)', marginBottom: '4px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{u.filename}</div>
                        <div style={{
                          fontSize: '12px', color: 'var(--text-muted)',
                          fontWeight: 300, marginBottom: '6px',
                        }}>{u.email}</div>
                        {u.note && (
                          <div style={{
                            fontSize: '13px', color: 'var(--cream)',
                            fontWeight: 300, fontStyle: 'italic',
                            marginBottom: '6px', lineHeight: 1.5,
                          }}>"{u.note}"</div>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.6 }}>
                          {formatDate(u.created_at)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={() => downloadFile(u.storage_path, u.filename)}
                          style={{
                            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--cream)', padding: '8px 16px', cursor: 'pointer',
                            fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
                            textTransform: 'uppercase', fontFamily: 'var(--font-body)',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cream)'; e.currentTarget.style.color = 'var(--off-white)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--cream)' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download
                        </button>

                        <button
                          onClick={() => markReviewed(u.id, u.reviewed)}
                          style={{
                            background: u.reviewed ? 'rgba(74,222,128,0.1)' : 'rgba(255,215,0,0.1)',
                            border: `1px solid ${u.reviewed ? 'rgba(74,222,128,0.3)' : 'rgba(255,215,0,0.3)'}`,
                            color: u.reviewed ? '#4ade80' : '#FFD700',
                            padding: '8px 16px', cursor: 'pointer',
                            fontSize: '11px', fontWeight: 500,
                            letterSpacing: '1.5px', textTransform: 'uppercase',
                            fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          {u.reviewed ? 'Reviewed ✓' : 'Mark Reviewed'}
                        </button>
                      </div>
                    </div>

                    {/* Feedback section */}
                    <div style={{
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      paddingTop: '16px',
                    }}>
                      <label style={labelStyle}>Feedback for student</label>
                      <textarea
                        value={feedbackValues[u.id] ?? u.feedback ?? ''}
                        onChange={e => setFeedbackValues(v => ({ ...v, [u.id]: e.target.value }))}
                        placeholder="Write feedback visible to the student on their Member Dashboard..."
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                        onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                          onClick={() => handleFeedbackSave(u.id)}
                          disabled={feedbackSaving[u.id]}
                          style={{
                            background: feedbackSaving[u.id] ? 'var(--dark-4)' : 'var(--red)',
                            color: feedbackSaving[u.id] ? 'var(--text-muted)' : 'var(--off-white)',
                            border: 'none', padding: '9px 20px',
                            fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
                            textTransform: 'uppercase', fontFamily: 'var(--font-body)',
                            cursor: feedbackSaving[u.id] ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { if (!feedbackSaving[u.id]) e.currentTarget.style.background = 'var(--red-dim)' }}
                          onMouseLeave={e => { if (!feedbackSaving[u.id]) e.currentTarget.style.background = 'var(--red)' }}
                        >
                          {feedbackSaving[u.id] ? 'Saving...' : 'Save Feedback'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── MEMBERS TAB ── */}
        {tab === 'members' && (
          <>
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', marginBottom: '48px',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 52px)',
                letterSpacing: '3px', color: 'var(--off-white)', lineHeight: 0.95,
              }}>MEMBER<br /><span style={{ color: 'var(--red)' }}>ROSTER</span></h2>

              <div style={{ display: 'flex', gap: '2px' }}>
                {[
                  { value: members.length, label: 'Total', color: 'var(--off-white)' },
                  { value: inactiveCount, label: 'Awaiting', color: inactiveCount > 0 ? '#FFD700' : 'var(--off-white)' },
                  { value: members.filter(m => m.active).length, label: 'Active', color: '#4ade80' },
                ].map(({ value, label, color }) => (
                  <div key={label} style={{
                    background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.05)',
                    padding: '20px 28px', textAlign: 'center',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '36px',
                      letterSpacing: '2px', color, lineHeight: 1,
                    }}>{value}</div>
                    <div style={{
                      fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase',
                      color: 'var(--text-muted)', marginTop: '4px',
                    }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {members.length === 0 ? (
              <div style={{
                background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.05)',
                padding: '48px', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: '14px', fontWeight: 300,
              }}>
                No members yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {members.map((m) => (
                  <div key={m.id} style={{
                    background: 'var(--dark-3)',
                    border: `1px solid ${m.active ? 'rgba(74,222,128,0.12)' : 'rgba(255,215,0,0.15)'}`,
                    borderLeft: `3px solid ${m.active ? '#4ade80' : '#FFD700'}`,
                    padding: '20px 28px',
                  }}>
                    {/* Top row: email, tier, approve */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: '24px',
                      marginBottom: '16px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '13px', fontWeight: 400,
                          color: 'var(--off-white)', marginBottom: '4px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{m.discord_name || m.email || m.user_id}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.6 }}>
                          Joined {formatDate(m.created_at)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                        <select
                          value={m.tier || 'pending'}
                          onChange={e => updateTier(m.id, e.target.value)}
                          style={{
                            background: 'var(--dark-4)', color: 'var(--cream)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '8px 28px 8px 12px', cursor: 'pointer',
                            fontSize: '11px', fontWeight: 500,
                            letterSpacing: '1.5px', textTransform: 'uppercase',
                            fontFamily: 'var(--font-body)', outline: 'none',
                            appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
                            backgroundImage: selectChevron,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 10px center',
                          }}
                        >
                          {TIERS.map(t => (
                            <option key={t} value={t}>{t.toUpperCase()}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => toggleActive(m.id, m.active)}
                          style={{
                            background: m.active ? 'rgba(74,222,128,0.1)' : 'rgba(255,215,0,0.1)',
                            border: `1px solid ${m.active ? 'rgba(74,222,128,0.3)' : 'rgba(255,215,0,0.3)'}`,
                            color: m.active ? '#4ade80' : '#FFD700',
                            padding: '8px 16px', cursor: 'pointer',
                            fontSize: '11px', fontWeight: 500,
                            letterSpacing: '1.5px', textTransform: 'uppercase',
                            fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          {m.active ? 'Active ✓' : 'Approve'}
                        </button>
                      </div>
                    </div>

                    {/* Discord thread ID row */}
                    <div style={{
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      paddingTop: '14px',
                      display: 'flex', gap: '8px', alignItems: 'flex-end',
                    }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...labelStyle, marginBottom: '6px' }}>Discord Thread ID</label>
                        <input
                          type="text"
                          value={threadIdValues[m.id] ?? m.discord_thread_id ?? ''}
                          onChange={e => setThreadIdValues(v => ({ ...v, [m.id]: e.target.value }))}
                          placeholder="Paste the Discord thread ID for this student's channel..."
                          style={{ ...inputStyle, padding: '9px 12px', fontSize: '12px' }}
                          onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                        />
                      </div>
                      <button
                        onClick={() => handleThreadIdSave(m.id)}
                        disabled={threadIdSaving[m.id]}
                        style={{
                          background: threadIdSaving[m.id] ? 'var(--dark-4)' : 'none',
                          border: `1px solid ${threadIdSaving[m.id] ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}`,
                          color: threadIdSaving[m.id] ? 'var(--text-muted)' : 'var(--cream)',
                          padding: '9px 18px', cursor: threadIdSaving[m.id] ? 'not-allowed' : 'pointer',
                          fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
                          textTransform: 'uppercase', fontFamily: 'var(--font-body)',
                          transition: 'all 0.2s', flexShrink: 0,
                        }}
                        onMouseEnter={e => { if (!threadIdSaving[m.id]) { e.currentTarget.style.borderColor = 'var(--cream)'; e.currentTarget.style.color = 'var(--off-white)' } }}
                        onMouseLeave={e => { if (!threadIdSaving[m.id]) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--cream)' } }}
                      >
                        {threadIdSaving[m.id] ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── VIDEOS TAB ── */}
        {tab === 'videos' && (
          <>
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', marginBottom: '40px',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 52px)',
                letterSpacing: '3px', color: 'var(--off-white)', lineHeight: 0.95,
              }}>VIDEO<br /><span style={{ color: 'var(--red)' }}>LIBRARY</span></h2>

              <div style={{
                background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.05)',
                padding: '20px 28px', textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '36px',
                  letterSpacing: '2px', color: 'var(--off-white)', lineHeight: 1,
                }}>{videos.length}</div>
                <div style={{
                  fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase',
                  color: 'var(--text-muted)', marginTop: '4px',
                }}>Videos</div>
              </div>
            </div>

            {/* Video add/edit form */}
            <div
              id="video-form"
              style={{
                background: 'var(--dark-3)',
                border: `1px solid ${editingVideo ? 'rgba(232,25,44,0.35)' : 'rgba(255,255,255,0.06)'}`,
                borderTop: `2px solid ${editingVideo ? 'var(--red)' : 'rgba(255,255,255,0.1)'}`,
                padding: '32px', marginBottom: '32px',
              }}
            >
              <div style={{
                fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
                textTransform: 'uppercase', color: editingVideo ? 'var(--red)' : 'var(--text-muted)',
                marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ width: '20px', height: '1px', background: editingVideo ? 'var(--red)' : 'var(--text-muted)', display: 'block' }} />
                {editingVideo ? 'Edit Video' : 'Add Video'}
              </div>

              <form onSubmit={handleVideoSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>YouTube URL <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input
                    type="text" required
                    value={videoForm.youtube_url} onChange={setVF('youtube_url')}
                    placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Title <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input
                    type="text" required
                    value={videoForm.title} onChange={setVF('title')}
                    placeholder="e.g. Nürburgring GP — Sector 1 Braking Points"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  {[
                    { field: 'track', placeholder: 'e.g. Nürburgring GP' },
                    { field: 'car', placeholder: 'e.g. GT3, Porsche Cup' },
                    { field: 'category', placeholder: 'e.g. Braking, Setup' },
                  ].map(({ field, placeholder }) => (
                    <div key={field}>
                      <label style={labelStyle}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                      <input
                        type="text"
                        value={videoForm[field]} onChange={setVF(field)}
                        placeholder={placeholder} style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    value={videoForm.description} onChange={setVF('description')}
                    placeholder="Brief description of what this video covers..."
                    rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
                <div style={{ marginBottom: '28px', maxWidth: '160px' }}>
                  <label style={labelStyle}>Sort Order</label>
                  <input
                    type="number"
                    value={videoForm.sort_order} onChange={setVF('sort_order')}
                    placeholder="0" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>

                {videoError && (
                  <div style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '16px', fontWeight: 300 }}>
                    {videoError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit" disabled={videoSubmitting}
                    style={{
                      background: videoSubmitting ? 'var(--dark-4)' : 'var(--red)',
                      color: videoSubmitting ? 'var(--text-muted)' : 'var(--off-white)',
                      border: 'none', padding: '12px 32px',
                      fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
                      textTransform: 'uppercase', cursor: videoSubmitting ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!videoSubmitting) e.currentTarget.style.background = 'var(--red-dim)' }}
                    onMouseLeave={e => { if (!videoSubmitting) e.currentTarget.style.background = 'var(--red)' }}
                  >
                    {videoSubmitting ? 'Saving...' : editingVideo ? 'Save Changes' : 'Add Video'}
                  </button>
                  {editingVideo && (
                    <button
                      type="button" onClick={cancelEditVideo}
                      style={{
                        background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-muted)', padding: '12px 24px',
                        fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
                        textTransform: 'uppercase', cursor: 'pointer',
                        fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cream)'; e.currentTarget.style.color = 'var(--cream)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Video list */}
            {videos.length === 0 ? (
              <div style={{
                background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.05)',
                padding: '48px', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: '14px', fontWeight: 300,
              }}>
                No videos yet — add one above
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {videos.map((v) => (
                  <div key={v.id} style={{
                    background: editingVideo?.id === v.id ? 'var(--dark-4)' : 'var(--dark-3)',
                    border: `1px solid ${editingVideo?.id === v.id ? 'rgba(232,25,44,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    borderLeft: `3px solid ${editingVideo?.id === v.id ? 'var(--red)' : 'rgba(255,255,255,0.08)'}`,
                    padding: '20px 24px',
                    display: 'flex', alignItems: 'center', gap: '20px',
                  }}>
                    <img
                      src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`}
                      alt={v.title}
                      style={{
                        width: '120px', height: '68px', objectFit: 'cover',
                        flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px', fontWeight: 400, color: 'var(--off-white)',
                        marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{v.title}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {v.track && <AdminTag label={v.track} />}
                        {v.car && <AdminTag label={v.car} />}
                        {v.category && <AdminTag label={v.category} accent />}
                      </div>
                      {v.sort_order != null && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', opacity: 0.5 }}>
                          order: {v.sort_order}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button onClick={() => startEditVideo(v)} style={editBtnStyle}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cream)'; e.currentTarget.style.color = 'var(--off-white)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--cream)' }}
                      >Edit</button>
                      {deleteVideoConfirm === v.id ? (
                        <>
                          <button onClick={() => handleDeleteVideo(v.id)} style={confirmDeleteBtnStyle}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,25,44,0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,25,44,0.15)'}
                          >Confirm</button>
                          <button onClick={() => setDeleteVideoConfirm(null)} style={cancelBtnStyle}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteVideoConfirm(v.id)} style={deleteBtnStyle}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,25,44,0.4)'; e.currentTarget.style.color = 'var(--red)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                        >Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SETUPS TAB ── */}
        {tab === 'setups' && (
          <>
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', marginBottom: '40px',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 52px)',
                letterSpacing: '3px', color: 'var(--off-white)', lineHeight: 0.95,
              }}>SETUP<br /><span style={{ color: 'var(--red)' }}>LIBRARY</span></h2>

              <div style={{
                background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.05)',
                padding: '20px 28px', textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '36px',
                  letterSpacing: '2px', color: 'var(--off-white)', lineHeight: 1,
                }}>{setups.length}</div>
                <div style={{
                  fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase',
                  color: 'var(--text-muted)', marginTop: '4px',
                }}>Setups</div>
              </div>
            </div>

            {/* Setup upload/edit form */}
            <div
              id="setup-form"
              style={{
                background: 'var(--dark-3)',
                border: `1px solid ${editingSetup ? 'rgba(232,25,44,0.35)' : 'rgba(255,255,255,0.06)'}`,
                borderTop: `2px solid ${editingSetup ? 'var(--red)' : 'rgba(255,255,255,0.1)'}`,
                padding: '32px', marginBottom: '32px',
              }}
            >
              <div style={{
                fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
                textTransform: 'uppercase', color: editingSetup ? 'var(--red)' : 'var(--text-muted)',
                marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ width: '20px', height: '1px', background: editingSetup ? 'var(--red)' : 'var(--text-muted)', display: 'block' }} />
                {editingSetup ? 'Edit Setup' : 'Upload Setup'}
              </div>

              <form onSubmit={handleSetupSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>
                    Setup File{' '}
                    {!editingSetup && <span style={{ color: 'var(--red)' }}>*</span>}
                    {editingSetup && (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 300, textTransform: 'none', letterSpacing: 0 }}>
                        {' '}— leave blank to keep existing
                      </span>
                    )}
                  </label>
                  <input
                    type="file"
                    required={!editingSetup}
                    onChange={e => setSetupFile(e.target.files[0] || null)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  />
                  {editingSetup && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', opacity: 0.7 }}>
                      Current file: {editingSetup.filename}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Title <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input
                    type="text" required
                    value={setupForm.title} onChange={setSF('title')}
                    placeholder="e.g. Nürburgring Qualifying — Low Fuel"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <label style={labelStyle}>Track</label>
                    <input
                      type="text"
                      value={setupForm.track} onChange={setSF('track')}
                      placeholder="e.g. Nürburgring GP"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Car</label>
                    <input
                      type="text"
                      value={setupForm.car} onChange={setSF('car')}
                      placeholder="e.g. Porsche 911 GT3"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select
                      value={setupForm.setup_type} onChange={setSF('setup_type')}
                      style={selectStyle}
                    >
                      <option value="">Select type...</option>
                      {SETUP_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    value={setupForm.description} onChange={setSF('description')}
                    placeholder="Notes on this setup — conditions it works best in, key adjustments made..."
                    rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>

                <div style={{ marginBottom: '28px', maxWidth: '160px' }}>
                  <label style={labelStyle}>Sort Order</label>
                  <input
                    type="number"
                    value={setupForm.sort_order} onChange={setSF('sort_order')}
                    placeholder="0" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>

                {setupError && (
                  <div style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '16px', fontWeight: 300 }}>
                    {setupError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit" disabled={setupSubmitting}
                    style={{
                      background: setupSubmitting ? 'var(--dark-4)' : 'var(--red)',
                      color: setupSubmitting ? 'var(--text-muted)' : 'var(--off-white)',
                      border: 'none', padding: '12px 32px',
                      fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
                      textTransform: 'uppercase', cursor: setupSubmitting ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!setupSubmitting) e.currentTarget.style.background = 'var(--red-dim)' }}
                    onMouseLeave={e => { if (!setupSubmitting) e.currentTarget.style.background = 'var(--red)' }}
                  >
                    {setupSubmitting ? 'Uploading...' : editingSetup ? 'Save Changes' : 'Upload Setup'}
                  </button>
                  {editingSetup && (
                    <button
                      type="button" onClick={cancelEditSetup}
                      style={{
                        background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-muted)', padding: '12px 24px',
                        fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
                        textTransform: 'uppercase', cursor: 'pointer',
                        fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cream)'; e.currentTarget.style.color = 'var(--cream)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Setups list */}
            {setups.length === 0 ? (
              <div style={{
                background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.05)',
                padding: '48px', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: '14px', fontWeight: 300,
              }}>
                No setups yet — upload one above
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {setups.map((s) => (
                  <div key={s.id} style={{
                    background: editingSetup?.id === s.id ? 'var(--dark-4)' : 'var(--dark-3)',
                    border: `1px solid ${editingSetup?.id === s.id ? 'rgba(232,25,44,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    borderLeft: `3px solid ${editingSetup?.id === s.id ? 'var(--red)' : 'rgba(255,255,255,0.08)'}`,
                    padding: '20px 24px',
                    display: 'flex', alignItems: 'center', gap: '20px',
                  }}>
                    <div style={{ color: 'var(--red)', flexShrink: 0 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px', fontWeight: 400, color: 'var(--off-white)',
                        marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{s.title}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        {s.track && <AdminTag label={s.track} />}
                        {s.car && <AdminTag label={s.car} />}
                        {s.setup_type && <AdminTag label={s.setup_type} accent />}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.5 }}>
                        {s.filename}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button onClick={() => startEditSetup(s)} style={editBtnStyle}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cream)'; e.currentTarget.style.color = 'var(--off-white)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--cream)' }}
                      >Edit</button>
                      {deleteSetupConfirm === s.id ? (
                        <>
                          <button onClick={() => handleDeleteSetup(s)} style={confirmDeleteBtnStyle}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,25,44,0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,25,44,0.15)'}
                          >Confirm</button>
                          <button onClick={() => setDeleteSetupConfirm(null)} style={cancelBtnStyle}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteSetupConfirm(s.id)} style={deleteBtnStyle}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,25,44,0.4)'; e.currentTarget.style.color = 'var(--red)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                        >Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SESSIONS TAB ── */}
        {tab === 'sessions' && (
          <>
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', marginBottom: '40px',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 52px)',
                letterSpacing: '3px', color: 'var(--off-white)', lineHeight: 0.95,
              }}>SESSION<br /><span style={{ color: 'var(--red)' }}>RECORDINGS</span></h2>

              <div style={{
                background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.05)',
                padding: '20px 28px', textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '36px',
                  letterSpacing: '2px', color: 'var(--off-white)', lineHeight: 1,
                }}>{sessionVideos.length}</div>
                <div style={{
                  fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase',
                  color: 'var(--text-muted)', marginTop: '4px',
                }}>Sessions</div>
              </div>
            </div>

            {/* Add session form */}
            <div style={{
              background: 'var(--dark-3)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderTop: '2px solid rgba(255,255,255,0.1)',
              padding: '32px', marginBottom: '32px',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
                textTransform: 'uppercase', color: 'var(--text-muted)',
                marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ width: '20px', height: '1px', background: 'var(--text-muted)', display: 'block' }} />
                Add Session Recording
              </div>

              <form onSubmit={handleSessionSubmit}>
                {/* Student selector */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Student <span style={{ color: 'var(--red)' }}>*</span></label>
                  <select
                    required
                    value={sessionForm.user_id}
                    onChange={setSesF('user_id')}
                    style={selectStyle}
                  >
                    <option value="">Select a student...</option>
                    {activeMembers.map(m => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.discord_name ? `${m.discord_name} — ${m.email || m.user_id}` : (m.email || m.user_id)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* YouTube URL */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>YouTube URL <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input
                    type="text" required
                    value={sessionForm.youtube_url} onChange={setSesF('youtube_url')}
                    placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>

                {/* Title */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Title <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input
                    type="text" required
                    value={sessionForm.title} onChange={setSesF('title')}
                    placeholder="e.g. Nürburgring Session — Lap Analysis"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>

                {/* Session date + Notes */}
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '12px', marginBottom: '28px' }}>
                  <div>
                    <label style={labelStyle}>Session Date</label>
                    <input
                      type="date"
                      value={sessionForm.session_date} onChange={setSesF('session_date')}
                      style={{
                        ...inputStyle,
                        colorScheme: 'dark',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Notes</label>
                    <textarea
                      value={sessionForm.notes} onChange={setSesF('notes')}
                      placeholder="Session notes visible to the student below the video..."
                      rows={1}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                      onFocus={e => e.target.style.borderColor = 'rgba(232,25,44,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                </div>

                {sessionError && (
                  <div style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '16px', fontWeight: 300 }}>
                    {sessionError}
                  </div>
                )}

                <button
                  type="submit" disabled={sessionSubmitting}
                  style={{
                    background: sessionSubmitting ? 'var(--dark-4)' : 'var(--red)',
                    color: sessionSubmitting ? 'var(--text-muted)' : 'var(--off-white)',
                    border: 'none', padding: '12px 32px',
                    fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
                    textTransform: 'uppercase', cursor: sessionSubmitting ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!sessionSubmitting) e.currentTarget.style.background = 'var(--red-dim)' }}
                  onMouseLeave={e => { if (!sessionSubmitting) e.currentTarget.style.background = 'var(--red)' }}
                >
                  {sessionSubmitting ? 'Saving...' : 'Add Session'}
                </button>
              </form>
            </div>

            {/* Sessions list */}
            {sessionVideos.length === 0 ? (
              <div style={{
                background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.05)',
                padding: '48px', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: '14px', fontWeight: 300,
              }}>
                No sessions yet — add one above
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {sessionVideos.map((s) => {
                  const student = memberByUserId[s.user_id]
                  const studentLabel = student?.discord_name || student?.email || s.user_id
                  return (
                    <div key={s.id} style={{
                      background: 'var(--dark-3)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderLeft: '3px solid rgba(232,25,44,0.4)',
                      padding: '20px 24px',
                      display: 'flex', alignItems: 'center', gap: '20px',
                    }}>
                      <img
                        src={`https://img.youtube.com/vi/${s.youtube_id}/mqdefault.jpg`}
                        alt={s.title}
                        style={{
                          width: '120px', height: '68px', objectFit: 'cover',
                          flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '13px', fontWeight: 400, color: 'var(--off-white)',
                          marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{s.title}</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '4px' }}>
                          <AdminTag label={studentLabel} accent />
                          {s.session_date && (
                            <AdminTag label={new Date(s.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
                          )}
                        </div>
                        {s.notes && (
                          <div style={{
                            fontSize: '12px', color: 'var(--text-muted)',
                            fontWeight: 300, fontStyle: 'italic',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>"{s.notes}"</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        {deleteSessionConfirm === s.id ? (
                          <>
                            <button onClick={() => handleDeleteSession(s.id)} style={confirmDeleteBtnStyle}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,25,44,0.25)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,25,44,0.15)'}
                            >Confirm</button>
                            <button onClick={() => setDeleteSessionConfirm(null)} style={cancelBtnStyle}>Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteSessionConfirm(s.id)} style={deleteBtnStyle}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,25,44,0.4)'; e.currentTarget.style.color = 'var(--red)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                          >Delete</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

function AdminTag({ label, accent }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 500, letterSpacing: '1.5px',
      textTransform: 'uppercase',
      color: accent ? 'var(--red)' : 'var(--text-muted)',
      border: `1px solid ${accent ? 'rgba(232,25,44,0.3)' : 'rgba(255,255,255,0.1)'}`,
      padding: '2px 8px',
    }}>{label}</span>
  )
}

const editBtnStyle = {
  background: 'none', border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--cream)', padding: '8px 16px', cursor: 'pointer',
  fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
  textTransform: 'uppercase', fontFamily: 'var(--font-body)',
  transition: 'all 0.2s',
}

const deleteBtnStyle = {
  background: 'none', border: '1px solid rgba(255,255,255,0.06)',
  color: 'var(--text-muted)', padding: '8px 16px', cursor: 'pointer',
  fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
  textTransform: 'uppercase', fontFamily: 'var(--font-body)',
  transition: 'all 0.2s',
}

const confirmDeleteBtnStyle = {
  background: 'rgba(232,25,44,0.15)', border: '1px solid rgba(232,25,44,0.5)',
  color: 'var(--red)', padding: '8px 16px', cursor: 'pointer',
  fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
  textTransform: 'uppercase', fontFamily: 'var(--font-body)',
  transition: 'all 0.2s',
}

const cancelBtnStyle = {
  background: 'none', border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--text-muted)', padding: '8px 16px', cursor: 'pointer',
  fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
  textTransform: 'uppercase', fontFamily: 'var(--font-body)',
}
