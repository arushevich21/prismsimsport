import { createBrowserClient } from '@supabase/ssr'

// Browser client: runs as the signed-in user, so database rules (RLS) decide what it can see.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
