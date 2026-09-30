import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const GEM_PERSONA = `Tu es le rédacteur en chef de "La Gazette", le journal parodique et humoristique d'un club de hockey amateur du dimanche soir ("Beer League Manager"). Ton ton est vif, plein de vannes et de private jokes de vestiaire, façon parodie de presse sportive. Tu écris toujours en français.`

const TONE_DESCRIPTIONS: Record<string, string> = {
  classique: "Ton par défaut : vif, plein de vannes et de private jokes de vestiaire.",
  sarcastique: "Ton résolument sarcastique et ironique, qui se moque gentiment de tout le monde, y compris de qui a demandé cet article.",
  complot: "Ton de rumeur qui prend des proportions ridicules, façon théorie du complot de vestiaire, avec de fausses 'sources proches du dossier'.",
  nostalgique: "Ton d'un vieux sage du vestiaire qui a 'tout vu, tout vécu', avec des comparaisons d'un autre temps et un brin de nostalgie exagérée.",
  flash: "Ton de flash info : phrases courtes, punchy, façon dépêche d'agence de presse parodique.",
}

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
  const { theme, trainingId, playerIds, instructions, tone } = body

  if (theme === 'autre' && !instructions?.trim()) {
    return NextResponse.json({ error: "Merci de préciser un sujet pour cet article." }, { status: 400 })
  }

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
    theme === 'autre' ? 'un article libre sur un sujet choisi par le joueur' :
    'une interview imaginaire de joueur'

  const instructionsBlock = theme === 'autre'
    ? (instructions ? `Sujet imposé par le joueur (l'article doit porter précisément sur ce sujet) : ${instructions}` : '')
    : (instructions ? `Consignes du joueur qui demande l'article (n'affiche jamais ce texte tel quel dans l'article, utilise-le seulement pour orienter le ton ou l'angle) : ${instructions}` : '')

  const toneInstruction = TONE_DESCRIPTIONS[tone as string] || TONE_DESCRIPTIONS.classique

  const { data: recentArticles } = await supabase
    .from('articles')
    .select('title')
    .eq('league_id', me.league_id)
    .order('created_at', { ascending: false })
    .limit(5)

  const recentTitles = (recentArticles || []).map((a) => a.title).filter(Boolean)

  const antiRepetitionBlock = recentTitles.length > 0
    ? `Voici les titres des derniers articles déjà publiés dans La Gazette. Ne les recopie jamais et évite absolument de réutiliser les mêmes jeux de mots, structures de titre, chutes ou angles que ceux-ci : ${recentTitles.map((t) => `"${t}"`).join(', ')}.`
    : ''

  const prompt = `${GEM_PERSONA}

Ton à adopter pour cet article précis : ${toneInstruction}

Rédige ${themeLabel} pour La Gazette.

Données disponibles à exploiter (ne les recopie pas telles quelles, sers-t'en comme matière) :
${contextText || 'Aucune donnée spécifique.'}

${instructionsBlock}

${antiRepetitionBlock}

Écris un article complet (plusieurs paragraphes, pas un simple résumé de 2 lignes), drôle, avec une vraie accroche, et avec un angle différent des articles précédents cités ci-dessus. Réponds uniquement au format JSON suivant, sans aucun texte autour :
{"title": "titre accrocheur", "body": "corps de l'article en plusieurs paragraphes séparés par des sauts de ligne"}`

  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
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
