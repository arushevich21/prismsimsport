import type { Metadata } from 'next'
import { TeamView } from '@/components/site/TeamView'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Team',
  description: 'PRISM lineups and results in Le Mans Ultimate, and in ACC with Falcon Motorsport.',
}

// /team shows the LMU program (home series). ACC lives at /team/acc.
export default function TeamPage() {
  return <TeamView sim="lmu" />
}
