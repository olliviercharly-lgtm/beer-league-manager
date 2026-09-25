import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/app/components/NavBar'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: player } = await supabase
    .from('players')
    .select('first_name, last_name, team, role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!player) {
    redirect('/onboarding')
  }

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 500, margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>Salut {player.first_name} !</h1>
        <p>Tu es dans l&apos;équipe {player.team === 'noir' ? 'Noir' : 'Blanc'}.</p>
      </div>
    </div>
  )
}
