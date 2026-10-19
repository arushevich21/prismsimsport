import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Anonymous, cookie-less client for public pages. Because it never reads
// cookies, those pages can be cached and rebuilt in the background (ISR)
// instead of running on every visit. RLS limits it to public data.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
