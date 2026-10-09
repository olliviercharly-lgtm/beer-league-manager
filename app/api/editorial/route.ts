import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveEditorial } from '@/lib/editorial'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté.', status: 401 as const }

  const admin = createAdminClient()
  const { data: player } = await admin
    .from('players')
    .select('role, league_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!player?.league_id) return { error: 'Profil introuvable.', status: 400 as const }

  const isAdmin = player.role === 'admin' || player.role === 'super_admin'
  return { admin, leagueId: player.league_id as string, isAdmin }
}

// Lecture : tous les joueurs de la ligue (la Gazette a besoin de la liste des tons).
export async function GET() {
  const ctx = await getContext()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { data: league, error } = await ctx.admin
    .from('leagues')
    .select('editorial_settings')
    .eq('id', ctx.leagueId)
    .single()

  if (error) {
    // Colonne absente (script SQL pas encore lancé) : on renvoie les valeurs par défaut.
    return NextResponse.json({ settings: resolveEditorial(null), isCustom: false, isAdmin: ctx.isAdmin, warning: error.message })
  }

  return NextResponse.json({
    settings: resolveEditorial(league?.editorial_settings),
    isCustom: !!league?.editorial_settings,
    isAdmin: ctx.isAdmin,
  })
}

// Écriture : admins uniquement. Envoyer { settings: null } remet les réglages d'origine.
export async function PUT(request: Request) {
  const ctx = await getContext()
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  if (!ctx.isAdmin) return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const value = body.settings === null ? null : resolveEditorial(body.settings)

  const { error } = await ctx.admin
    .from('leagues')
    .update({ editorial_settings: value })
    .eq('id', ctx.leagueId)

  if (error) {
    const hint = error.message.includes('editorial_settings')
      ? " — le script SQL de la Salle de rédaction n'a pas encore été lancé dans Supabase."
      : ''
    return NextResponse.json({ error: `${error.message}${hint}` }, { status: 500 })
  }

  return NextResponse.json({ settings: value ?? resolveEditorial(null), isCustom: value !== null })
}
