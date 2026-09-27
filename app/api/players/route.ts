import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getAdminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté.', status: 401 as const }

  const admin = createAdminClient()
  const { data: me } = await admin
    .from('players')
    .select('id, role, league_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!me || (me.role !== 'admin' && me.role !== 'super_admin')) {
    return { error: 'Accès réservé aux administrateurs.', status: 403 as const }
  }

  return { me, admin }
}

export async function GET() {
  const result = await getAdminContext()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { me, admin } = result

  const { data: players, error } = await admin
    .from('players')
    .select('id, first_name, last_name, team, role')
    .eq('league_id', me.league_id)
    .order('first_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ players })
}

export async function PATCH(request: Request) {
  const result = await getAdminContext()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { me, admin } = result

  const body = await request.json()
  const { playerId, role } = body

  if (!playerId || (role !== 'player' && role !== 'admin')) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const { data: target } = await admin
    .from('players')
    .select('id, role, league_id')
    .eq('id', playerId)
    .maybeSingle()

  if (!target || target.league_id !== me.league_id) {
    return NextResponse.json({ error: 'Joueur introuvable.' }, { status: 404 })
  }

  if (target.role === 'super_admin') {
    return NextResponse.json({ error: 'Ce compte est protégé et ne peut pas être modifié.' }, { status: 403 })
  }

  const { error } = await admin
    .from('players')
    .update({ role })
    .eq('id', playerId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
