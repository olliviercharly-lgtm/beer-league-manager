import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from './OnboardingForm'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const next = `/onboarding${invite ? `?invite=${encodeURIComponent(invite)}` : ''}`
    const loginUrl = `/login?next=${encodeURIComponent(next)}${invite ? `&invite=${encodeURIComponent(invite)}` : ''}`
    redirect(loginUrl)
  }

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (player) {
    redirect('/calendar')
  }

  return <OnboardingForm initialCode={invite ?? ''} />
}
