// Helpers shared by the in-page admin editors (client side).
import { countries } from 'country-flag-icons'
import type { Sim } from '@/lib/types'

export const CLASSES: Record<Sim, string[]> = {
  lmu: ['Hypercar', 'LMP2', 'LMP3', 'LMGT3'],
  acc: ['GT3', 'GT4'],
}

let countryOptions: { code: string; name: string }[] | null = null

// Every country with a flag, sorted by English name.
export function getCountryOptions() {
  if (!countryOptions) {
    const names = new Intl.DisplayNames(['en'], { type: 'region' })
    countryOptions = countries
      .filter((c) => /^[A-Z]{2}$/.test(c))
      .map((code) => ({ code, name: names.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  return countryOptions
}

// <input type="datetime-local"> works in local time without a zone.
export function isoToLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function localInputToIso(value: string) {
  return value ? new Date(value).toISOString() : null
}

export const field =
  'w-full min-h-11 rounded-md border border-[#cbd1d9] bg-white px-3 py-2 text-ink focus:border-iris-deep focus:outline-none'
export const label = 'flex flex-col gap-1.5 text-[13px] text-[#4a4f57]'
export const smallBtn =
  'tap inline-flex items-center justify-center gap-1.5 rounded-md border border-[#cbd1d9] bg-white px-3 text-sm font-semibold text-ink hover:bg-mist disabled:opacity-50'
export const primaryBtn =
  'tap inline-flex items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-graphite-2 disabled:opacity-50'
export const dangerBtn =
  'tap inline-flex items-center justify-center rounded-md border border-[#e3b4b4] bg-white px-3 text-sm font-semibold text-[#8a1c1c] hover:bg-[#fdecec] disabled:opacity-50'

export function errorText(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Something went wrong.'
}

export const uid = () => Math.random().toString(36).slice(2)

// Shrinks a photo in the browser before upload: 800px on the long side, WebP.
// Keeps storage tiny and pages fast.
export async function resizeImage(file: File, max = 800): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/webp', 0.85)
  )
}
