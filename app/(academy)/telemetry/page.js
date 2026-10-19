'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function Telemetry() {
  const router = useRouter()
  const fileInputRef = useRef(null)
  const [user, setUser] = useState(null)
  const [file, setFile] = useState(null)
  const [note, setNote] = useState('')
  const [uploads, setUploads] = useState([])
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else {
        setUser(data.user)
        fetchUploads(data.user.id)
      }
    })
  }, [])

  const fetchUploads = async (userId) => {
    const { data } = await supabase
      .from('telemetry_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setUploads(data)
  }

  const handleFile = (f) => {
    if (f && f.name.toLowerCase().endsWith('.rpy')) {
      setFile(f)
      setError('')
    } else {
      setError('Please select a valid .rpy file')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }

  const handleUpload = async () => {
    if (!file || !user) return
    setUploading(true)
    setError('')
    setProgress(0)
    setTimeLeft(null)

    const storagePath = `${user.id}/${Date.now()}_${file.name}`
    const startTime = Date.now()

    const xhr = new XMLHttpRequest()
    const { data: { session } } = await supabase.auth.getSession()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100)
        setProgress(pct)
        const elapsed = (Date.now() - startTime) / 1000
        const rate = e.loaded / elapsed
        const remaining = (e.total - e.loaded) / rate
        setTimeLeft(remaining < 1 ? 'almost done...' : `~${Math.ceil(remaining)}s remaining`)
      }
    })

    xhr.addEventListener('load', async () => {
      if (xhr.status === 200) {
        const { error: dbError } = await supabase
          .from('telemetry_uploads')
          .insert({
            user_id: user.id,
            email: user.email,
            filename: file.name,
            storage_path: storagePath,
            note: note.trim() || null,
          })

        if (dbError) {
          setError(dbError.message)
        } else {
          setFile(null)
          setNote('')
          setSuccess(true)
          setProgress(100)
          fetchUploads(user.id)
          setTimeout(() => { setSuccess(false); setProgress(0); setTimeLeft(null) }, 4000)
        }
      } else {
        setError('Upload failed — please try again')
      }
      setUploading(false)
    })

    xhr.addEventListener('error', () => {
      setError('Upload failed — please try again')
      setUploading(false)
    })

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/telemetry/${storagePath}`
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.send(file)
  }

  const formatDate = (ts) => new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  const getProgressColor = (pct) => {
    if (pct <= 50) {
      const r = Math.round(255 - (255 - 74) * (pct / 50))
      const g = Math.round(215 + (222 - 215) * (pct / 50))
      const b = Math.round(0 + (128 - 0) * (pct / 50))
      return `rgb(${r}, ${g}, ${b})`
    } else {
      const t = (pct - 50) / 50
      const r = Math.round(74 + (168 - 74) * t)
      const g = Math.round(222 + (85 - 222) * t)
      const b = Math.round(128 + (247 - 128) * t)
      return `rgb(${r}, ${g}, ${b})`
    }
  }

  if (!user) return null

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

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px', margin: '0 auto' }}>

        {/* back button */}
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

        {/* heading */}
        <div style={{
          fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
          textTransform: 'uppercase', color: 'var(--red)',
          marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ width: '24px', height: '1px', background: 'var(--red)', display: 'block' }} />
          Telemetry
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 6vw, 64px)',
          letterSpacing: '3px', color: 'var(--off-white)',
          lineHeight: 0.95, marginBottom: '12px',
        }}>UPLOAD<br /><span style={{ color: 'var(--red)' }}>TELEMETRY</span></h1>

        <p style={{
          fontSize: '14px', fontWeight: 300, color: 'var(--text-muted)',
          lineHeight: 1.7, marginBottom: '48px', maxWidth: '480px',
        }}>
          Upload your .rpy lap files and add a note for your coach. Files are private and only visible to you and DTS Academy staff.
        </p>

        {/* drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          style={{
            border: `1px dashed ${dragging ? 'var(--red)' : file ? 'rgba(232,25,44,0.5)' : 'rgba(255,255,255,0.12)'}`,
            background: dragging ? 'rgba(232,25,44,0.04)' : 'var(--dark-3)',
            padding: '48px 32px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '2px',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".rpy"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />

          {file ? (
            <>
              <div style={{ color: 'var(--red)', marginBottom: '12px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '20px',
                letterSpacing: '2px', color: 'var(--off-white)', marginBottom: '4px',
              }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {(file.size / 1024).toFixed(1)} KB · Click to change
              </div>
            </>
          ) : (
            <>
              <div style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '20px',
                letterSpacing: '2px', color: 'var(--off-white)', marginBottom: '8px',
              }}>DROP YOUR .RPY FILE HERE</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                or click to browse
              </div>
            </>
          )}
        </div>

        {/* note input */}
        <div style={{ marginBottom: '16px' }}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note for your coach — e.g. 'Spa Q3, losing time in sector 2 at Pouhon'"
            rows={3}
            style={{
              width: '100%', padding: '16px',
              background: 'var(--dark-3)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderTop: 'none',
              color: 'var(--off-white)', fontSize: '14px',
              fontFamily: 'var(--font-body)', fontWeight: 300,
              resize: 'vertical', outline: 'none',
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* progress bar */}
        {uploading && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              height: '4px',
              background: 'var(--dark-4)',
              marginBottom: '8px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: getProgressColor(progress),
                transition: 'width 0.3s ease, background 0.5s ease',
                boxShadow: `0 0 8px ${getProgressColor(progress)}80`,
              }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: getProgressColor(progress),
              transition: 'color 0.5s ease',
            }}>
              <span>{progress}%</span>
              {timeLeft && <span>{timeLeft}</span>}
            </div>
          </div>
        )}

        {/* error */}
        {error && (
          <div style={{
            fontSize: '13px', color: 'var(--red)',
            marginBottom: '16px', fontWeight: 300,
          }}>{error}</div>
        )}

        {/* success */}
        {success && (
          <div style={{
            fontSize: '13px', color: '#4ade80',
            marginBottom: '16px', fontWeight: 300, letterSpacing: '0.5px',
          }}>
            File uploaded successfully — your coach will review it shortly.
          </div>
        )}

        {/* upload button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{
            width: '100%', padding: '16px',
            background: !file || uploading ? 'var(--dark-4)' : 'var(--red)',
            color: !file || uploading ? 'var(--text-muted)' : 'var(--off-white)',
            border: 'none', fontSize: '13px', fontWeight: 500,
            letterSpacing: '1.5px', textTransform: 'uppercase',
            cursor: !file || uploading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)', marginBottom: '64px',
            transition: 'all 0.2s',
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Telemetry'}
        </button>

        {/* previous uploads */}
        {uploads.length > 0 && (
          <>
            <div style={{
              fontSize: '11px', fontWeight: 500, letterSpacing: '3px',
              textTransform: 'uppercase', color: 'var(--text-muted)',
              marginBottom: '16px',
            }}>Previous Uploads</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {uploads.map((u) => (
                <div key={u.id} style={{
                  background: 'var(--dark-3)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '20px 24px',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: '16px',
                }}>
                  <div>
                    <div style={{
                      fontSize: '14px', fontWeight: 400,
                      color: 'var(--off-white)', marginBottom: '4px',
                    }}>{u.filename}</div>
                    {u.note && (
                      <div style={{
                        fontSize: '12px', color: 'var(--text-muted)',
                        fontWeight: 300, marginBottom: '4px',
                      }}>{u.note}</div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.6 }}>
                      {formatDate(u.created_at)}
                    </div>
                  </div>
                  <div style={{
                    flexShrink: 0,
                    fontSize: '10px', fontWeight: 500, letterSpacing: '1.5px',
                    textTransform: 'uppercase', padding: '4px 12px',
                    border: `1px solid ${u.reviewed ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    color: u.reviewed ? '#4ade80' : 'var(--text-muted)',
                  }}>
                    {u.reviewed ? 'Reviewed' : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}