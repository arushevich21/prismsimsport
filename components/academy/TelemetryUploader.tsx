'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { recordTelemetry } from '@/lib/academy/actions'
import { TELEMETRY_EXTENSIONS, TELEMETRY_MAX_BYTES } from '@/lib/academy/constants'
import { createClient } from '@/lib/supabase/client'

// Uploads straight from the browser to Supabase Storage (so big replay files
// never pass through Vercel), with a progress bar. Then records the upload.
export function TelemetryUploader({ userId }: { userId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [dragging, setDragging] = useState(false)

  function pick(f: File | undefined) {
    setMessage(null)
    if (!f) return
    if (!TELEMETRY_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))) {
      setMessage({ kind: 'error', text: `Supported files: ${TELEMETRY_EXTENSIONS.join(', ')}` })
      return
    }
    if (f.size > TELEMETRY_MAX_BYTES) {
      setMessage({ kind: 'error', text: 'That file is over 100 MB. Zip it or trim the replay first.' })
      return
    }
    setFile(f)
  }

  async function upload() {
    if (!file) return
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    if (!data.session) return setMessage({ kind: 'error', text: 'Please sign in again.' })

    const path = `${userId}/${crypto.randomUUID()}_${file.name.replace(/[^\w.-]+/g, '_')}`
    setProgress(0)
    setMessage(null)
    const ok = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100)))
      xhr.addEventListener('load', () => resolve(xhr.status >= 200 && xhr.status < 300))
      xhr.addEventListener('error', () => resolve(false))
      xhr.open('POST', `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/telemetry/${path}`)
      xhr.setRequestHeader('Authorization', `Bearer ${data.session!.access_token}`)
      xhr.setRequestHeader('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      xhr.send(file)
    })
    if (!ok) {
      setProgress(null)
      return setMessage({ kind: 'error', text: 'Upload failed. Please try again.' })
    }
    const res = await recordTelemetry({ path, filename: file.name, note })
    setProgress(null)
    if (!res.ok) return setMessage({ kind: 'error', text: res.error })
    setFile(null)
    setNote('')
    if (inputRef.current) inputRef.current.value = ''
    setMessage({ kind: 'ok', text: 'Sent to your coach. You’ll see their feedback here.' })
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]) }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center sm:p-8 ${dragging ? 'border-iris-deep bg-[#f4f4fe]' : 'border-[#cbd1d9]'}`}
      >
        <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-[#4a4f57]"><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 20h16" /></svg>
        <span className="font-semibold">{file ? file.name : 'Choose a replay or telemetry file'}</span>
        <span className="text-[13px] text-muted">
          {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · tap to change` : `${TELEMETRY_EXTENSIONS.join(' ')} · up to 100 MB`}
        </span>
        <input ref={inputRef} type="file" accept={TELEMETRY_EXTENSIONS.join(',')} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] text-[#4a4f57]">
        What should your coach look at?
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="e.g. Losing time in the last sector, especially turn 12" className="rounded-lg border border-[#cbd1d9] px-3 py-2.5 text-ink focus:border-iris-deep focus:outline-none" />
      </label>
      {progress !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
          <div className="h-full bg-ice transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={upload} disabled={!file || progress !== null} className="tap rounded-md bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
          {progress !== null ? `Uploading ${progress}%` : 'Send to my coach'}
        </button>
        {message && <span role="status" className={`text-sm ${message.kind === 'ok' ? 'text-ice-deep' : 'text-[#8a1c1c]'}`}>{message.text}</span>}
      </div>
    </div>
  )
}
