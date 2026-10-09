import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJson } from '@/lib/gemini'

export const maxDuration = 60

const GEM_PERSONA = `Tu rédiges les biographies affichées sur les fiches joueurs d'une application de gestion pour un club de hockey amateur du dimanche soir ("Beer League Manager"). Le ton est chaleureux et un brin humoristique, comme une fiche de présentation officielle mais version amateur et complice. Tu écris toujours en français, à la troisième personne, en 2 à 4 phrases maximum : c'est une courte bio de fiche joueur, pas un article.`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })
  }

  const { data: me } = await supabase
    .from('players')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!me) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 400 })
  }

  const body = await request.json()
  const { playerId, instructions } = body

  if (!playerId || playerId !== me.id) {
    return NextResponse.json({ error: 'Vous ne pouvez générer que votre propre bio.' }, { status: 403 })
  }

  const { data: player } = await supabase
    .from('players')
    .select('first_name, last_name, team, position, style, bio, hometown, joined_year')
    .eq('id', playerId)
    .single()

  if (!player) {
    return NextResponse.json({ error: 'Joueur introuvable.' }, { status: 404 })
  }

  const { data: palmares } = await supabase
    .from('palmares')
    .select('trophy, year')
    .eq('player_id', playerId)

  const { data: notes } = await supabase
    .from('player_notes')
    .select('text, year')
    .eq('player_id', playerId)

  const trophies = (palmares || []).map((p) => `${p.trophy}${p.year ? ` (${p.year})` : ''}`).join(', ')
  const anecdotes = (notes || []).map((n) => n.text).join(' ; ')

  const contextText = `${player.first_name} ${player.last_name} — équipe ${player.team}, ${player.position}${player.style ? `, style: ${player.style}` : ''}${player.hometown ? `, originaire de ${player.hometown}` : ''}${player.joined_year ? `, dans le club depuis ${player.joined_year}` : ''}.${player.bio ? ` Bio actuelle : ${player.bio}` : ''}${trophies ? ` Palmarès : ${trophies}.` : ''}${anecdotes ? ` Anecdotes : ${anecdotes}.` : ''}`

  const prompt = `${GEM_PERSONA}

Données disponibles sur le joueur (ne les recopie pas telles quelles, sers-t'en comme matière) :
${contextText}

${instructions ? `Consignes du joueur pour orienter la bio (n'affiche jamais ce texte tel quel) : ${instructions}` : ''}

Rédige la nouvelle bio. Réponds uniquement au format JSON suivant, sans aucun texte autour :
{"bio": "texte de la bio"}`

  try {
    const data = await generateJson<{ bio?: string }>(
      prompt,
      (d) => typeof d?.bio === 'string' && d.bio.trim().length > 0
    )
    return NextResponse.json({ bio: data.bio })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur de génération.' },
      { status: 503 }
    )
  }
}
