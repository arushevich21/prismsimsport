import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth'
import { DiscordSignIn } from './DiscordSignIn'

export const metadata: Metadata = { title: 'Sign in' }

// Paths a sign-in may return to. Anything else falls back to the dashboard.
const SAFE_NEXT = ['/apply', '/dashboard', '/pending', '/admin', '/library', '/setups', '/schedule', '/telemetry', '/members']

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams
  const target = next && SAFE_NEXT.includes(next) ? next : '/dashboard'

  if (await getViewer()) redirect(target)

  return (
    <section className="page-x flex justify-center py-16 sm:py-24">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border border-line bg-white p-6 text-center sm:p-10">
        <h1 className="font-heading text-3xl font-bold">Sign in</h1>
        <p className="leading-relaxed text-[#4a4f57]">
          PRISM uses your Discord account for the team, the community and the Academy.
        </p>
        {error && (
          <p role="alert" className="rounded-md bg-[#fdecec] px-4 py-3 text-sm text-[#8a1c1c]">
            Sign-in didn&apos;t complete. Please try again.
          </p>
        )}
        <DiscordSignIn next={target} />
      </div>
    </section>
  )
}
