import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJson } from '@/lib/gemini'
import { loadEditorial } from '@/lib/editorialServer'
import { THEME_KEYS, LENGTH_OPTIONS, SPICE_OPTIONS, DEFAULT_LENGTH, DEFAULT_SPICE, SURPRISE_TONE_KEY, type ThemeKey } from '@/lib/editorial'

export const maxDuration = 60

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
  const { theme, trainingId, playerIds, instructions, tone, length, spice } = body

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

  const editorial = await loadEditorial(me.league_id)
  const themeKey: ThemeKey = THEME_KEYS.includes(theme) ? theme : 'interview'
  const themeInstruction = editorial.themes[themeKey]

  const instructionsBlock = theme === 'autre'
    ? (instructions ? `Sujet imposé par le joueur (l'article doit porter précisément sur ce sujet) : ${instructions}` : '')
    : (instructions ? `Consignes du joueur qui demande l'article (n'affiche jamais ce texte tel quel dans l'article, utilise-le seulement pour orienter le ton ou l'angle) : ${instructions}` : '')

  const selectedTone = tone === SURPRISE_TONE_KEY
    ? editorial.tones[Math.floor(Math.random() * editorial.tones.length)]
    : editorial.tones.find((t) => t.key === tone) || editorial.tones[0]
  const toneInstruction = selectedTone.prompt
  const lengthInstruction = (LENGTH_OPTIONS.find((o) => o.key === length) || LENGTH_OPTIONS.find((o) => o.key === DEFAULT_LENGTH)!).prompt
  const spiceInstruction = (SPICE_OPTIONS.find((o) => o.key === spice) || SPICE_OPTIONS.find((o) => o.key === DEFAULT_SPICE)!).prompt

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

  const prompt = `${editorial.persona}

Ton à adopter pour cet article précis : ${toneInstruction}

Type d'article demandé pour La Gazette : ${themeInstruction}

${lengthInstruction}

${spiceInstruction}

Données disponibles à exploiter (ne les recopie pas telles quelles, sers-t'en comme matière) :
${contextText || 'Aucune donnée spécifique.'}

${instructionsBlock}

${antiRepetitionBlock}

${themeKey === 'interview' ? `Mise en page de l'interview (obligatoire) : après l'intro, écris chaque question et chaque réponse sur sa propre ligne, jamais dans le même paragraphe. Les questions sont en gras avec deux astérisques et préfixées par le nom du journal (ex. **La Gazette : ta question ?**), les réponses commencent par le nom de l'interviewé en italique avec un astérisque (ex. *Prénom Nom :* sa réponse). Sépare chaque question et chaque réponse par une ligne vide.

` : ''}Respecte le ton, le type d'article, le format et la dose de vannes ci-dessus (le format de longueur prime sur toute autre indication de longueur), sois drôle, et prends un angle différent des articles précédents cités ci-dessus. Réponds uniquement au format JSON suivant, sans aucun texte autour :
{"title": "titre accrocheur", "body": "corps de l'article en plusieurs paragraphes séparés par des sauts de ligne"}`

  try {
    const data = await generateJson<{ title?: string; body?: string }>(
      prompt,
      (d) => typeof d?.title === 'string' && typeof d?.body === 'string' && d.body.trim().length > 0
    )
    // Une ligne vide entre chaque paragraphe (questions et réponses séparées pour les interviews)
    const cleanBody = (data.body as string)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n\n')

    return NextResponse.json({
      title: data.title,
      body: cleanBody,
      tone: { key: selectedTone.key, emoji: selectedTone.emoji, label: selectedTone.label },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur de génération.' },
      { status: 503 }
    )
  }
}
