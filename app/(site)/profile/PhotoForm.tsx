'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { resizeImage } from '@/lib/admin/shared'
import { removeDriverPhoto, setDriverPhoto } from '@/lib/profile/actions'

const btn = 'tap inline-flex min-h-11 cursor-pointer items-center rounded-md border border-line bg-white px-4 text-[15px] font-medium has-disabled:cursor-not-allowed has-disabled:opacity-50 disabled:opacity-50'

// Their driver card photo. Resized in the browser first, like the admin roster.
export function PhotoForm({ photoUrl }: { photoUrl: string | null }) {
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const upload = (file: File | undefined) => {
    if (!file) return
    setStatus(null)
    start(async () => {
      try {
        const fd = new FormData()
        fd.set('photo', await resizeImage(file), 'photo.webp')
        const res = await setDriverPhoto(fd)
        setStatus(res.ok ? 'Saved. It shows on the team page within a few minutes.' : res.error)
        if (res.ok) router.refresh()
      } catch {
        setStatus('Couldn’t read that image. Try a JPEG or PNG.')
      }
    })
  }

  const remove = () =>
    start(async () => {
      const res = await removeDriverPhoto()
      setStatus(res.ok ? 'Photo removed.' : res.error)
      if (res.ok) router.refresh()
    })

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
      <div className="relative aspect-[4/5] w-32 shrink-0 overflow-hidden rounded-lg bg-graphite">
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded photo from Supabase storage */}
        {photoUrl && <img src={photoUrl} alt="Your driver photo" className="absolute inset-0 h-full w-full object-cover" />}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <label className={btn}>
            {pending ? 'Saving…' : photoUrl ? 'Replace photo' : 'Upload photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={pending} onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          {photoUrl && <button type="button" className={btn} disabled={pending} onClick={remove}>Remove</button>}
        </div>
        <p className="text-sm text-muted" aria-live="polite">{status ?? 'A portrait photo works best; it’s cropped to 4:5.'}</p>
      </div>
    </div>
  )
}
