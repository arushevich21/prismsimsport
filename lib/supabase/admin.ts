import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role client: bypasses RLS. Server-only, and only after the caller's
// identity has been checked. Never trust a user id that came from the request body.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
