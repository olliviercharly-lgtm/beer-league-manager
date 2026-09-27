import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getAdminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté.', status: 401 as const }

  const admin = createAdminClient()
  const { data: player } = await admin
    .from('players')
    .select('role, league_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!player || (player.role !== 'admin' && player.role !== 'super_admin')) {
    return { error: 'Accès réservé aux administrateurs.', status: 403 as const }
  }

  return { leagueId: player.league_id as string, admin }
}

export async function GET() {
  const result = await getAdminContext()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { leagueId, admin } = result

  const { data: league, error } = await admin
    .from('leagues')
    .select('id, name, invite_code, team_noir_name, team_blanc_name, team_noir_color, team_blanc_color')
    .eq('id', leagueId)
    .single()

  if (error || !league) {
    return NextResponse.json({ error: 'Ligue introuvable.' }, { status: 404 })
  }

  return NextResponse.json({ league })
}

export async function PATCH(request: Request) {
  const result = await getAdminContext()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { leagueId, admin } = result

  const body = await request.json()
  const { name, team_noir_name, team_blanc_name, team_noir_color, team_blanc_color, invite_code } = body

  if (!name || !team_noir_name || !team_blanc_name || !team_noir_color || !team_blanc_color || !invite_code) {
    return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 })
  }

  const { data: codeTaken } = await admin
    .from('leagues')
    .select('id')
    .eq('invite_code', invite_code)
    .neq('id', leagueId)
    .maybeSingle()

  if (codeTaken) {
    return NextResponse.json({ error: "Ce code d'invitation est déjà utilisé par une autre ligue." }, { status: 409 })
  }

  const { error } = await admin
    .from('leagues')
    .update({ name, team_noir_name, team_blanc_name, team_noir_color, team_blanc_color, invite_code })
    .eq('id', leagueId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
