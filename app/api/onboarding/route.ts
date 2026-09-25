import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })
  }

  const body = await request.json()
  const { inviteCode, firstName, lastName, team, position, number } = body

  if (!inviteCode || !firstName || !lastName || !team || !position) {
    return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: league, error: leagueError } = await admin
    .from('leagues')
    .select('id')
    .eq('invite_code', inviteCode)
    .single()

  if (leagueError || !league) {
    return NextResponse.json({ error: "Code d'invitation invalide." }, { status: 400 })
  }

  const { data: existing } = await admin
    .from('players')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Une fiche joueur existe déjà pour ce compte.' }, { status: 409 })
  }

  const { error: insertError } = await admin.from('players').insert({
    league_id: league.id,
    auth_user_id: user.id,
    first_name: firstName,
    last_name: lastName,
    team,
    position,
    number: number || null,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
