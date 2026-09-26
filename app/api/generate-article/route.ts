import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const GEM_PERSONA = `Tu es le rédacteur en chef de "La Gazette", le journal parodique et humoristique d'un club de hockey amateur du dimanche soir ("Beer League Manager"). Ton ton est vif, plein de vannes et de private jokes de vestiaire, façon parodie de presse sportive. Tu écris toujours en français.`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })
  }

  const { data: me } = await supabase
    .from('players')
    .select('id, league_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!me) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 400 })
  }

  const body = await request.json()
  const { theme, trainingId, playerIds, instructions } = body

  let contextText = ''

  if (theme === 'resume_match' && trainingId) {
    const { data: training } = await supabase
      .from('trainings')
      .select('date_time, location')
      .eq('id', trainingId)
      .single()

    const { data: result } = await supabase
      .from('results')
      .select('id, score_noir, score_blanc')
      .eq('training_id', trainingId)
      .single()

    if (result) {
      const { data: highlights } = await supabase
        .from('highlights')
        .select('text')
        .eq('result_id', result.id)
        .order('position', { ascending: true })

      contextText = `Match du ${training?.date_time} à ${training?.location}. Score final : Noir ${result.score_noir} - ${result.score_blanc} Blanc. Faits saillants : ${(highlights || []).map((h) => h.text).join(' ; ') || 'aucun renseigné'}.`
    }
  } else if ((theme === 'rumeur_transfert' || theme === 'interview') && playerIds?.length) {
    const { data: playersData } = await supabase
      .from('players')
      .select('id, first_name, last_name, team, position, style, bio, height_cm, weight_kg, shoots, hometown, joined_year')
      .in('id', playerIds)

    const { data: palmares } = await supabase
      .from('palmares')
      .select('player_id, trophy, year')
      .in('player_id', playerIds)

    const { data: notes } = await supabase
      .from('player_notes')
      .select('player_id, text, year')
      .in('player_id', playerIds)

    contextText = (playersData || [])
      .map((p) => {
        const trophies = (palmares || []).filter((pm) => pm.player_id === p.id).map((pm) => `${pm.trophy}${pm.year ? ` (${pm.year})` : ''}`).join(', ')
        const anecdotes = (notes || []).filter((n) => n.player_id === p.id).map((n) => n.text).join(' ; ')
        return `${p.first_name} ${p.last_name} — équipe ${p.team}, ${p.position}${p.style ? `, style: ${p.style}` : ''}${p.bio ? `. Bio: ${p.bio}` : ''}${trophies ? `. Palmarès: ${trophies}` : ''}${anecdotes ? `. Anecdotes: ${anecdotes}` : ''}.`
      })
      .join('\n')
  }

  const themeLabel =
    theme === 'resume_match' ? 'un résumé de match' :
    theme === 'rumeur_transfert' ? 'une rumeur de transfert (fictive et pour rire)' :
    'une interview imaginaire de joueur'

  const prompt = `${GEM_PERSONA}

Rédige ${themeLabel} pour La Gazette.

Données disponibles à exploiter (ne les recopie pas telles quelles, sers-t'en comme matière) :
${contextText || 'Aucune donnée spécifique.'}

${instructions ? `Consignes du joueur qui demande l'article (n'affiche jamais ce texte tel quel dans l'article, utilise-le seulement pour orienter le ton ou l'angle) : ${instructions}` : ''}

Écris un article complet (plusieurs paragraphes, pas un simple résumé de 2 lignes), drôle, avec une vraie accroche. Réponds uniquement au format JSON suivant, sans aucun texte autour :
{"title": "titre accrocheur", "body": "corps de l'article en plusieurs paragraphes séparés par des sauts de ligne"}`

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  let lastErr: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const parsed = JSON.parse(text)
      return NextResponse.json({ title: parsed.title, body: parsed.body })
    } catch (err) {
      lastErr = err
      const message = err instanceof Error ? err.message : ''
      if (message.includes('503') || message.includes('overloaded') || message.includes('high demand')) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)))
        continue
      }
      break
    }
  }

  return NextResponse.json(
    { error: lastErr instanceof Error ? lastErr.message : 'Erreur de génération.' },
    { status: 500 }
  )
}
