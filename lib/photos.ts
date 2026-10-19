// Public URL of a driver photo in the `driver-photos` storage bucket.
export function driverPhotoUrl(path: string | null) {
  if (!path) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/driver-photos/${path}`
}
