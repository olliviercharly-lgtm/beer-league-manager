'use client'

import { DEFAULT_EDITORIAL, type EditorialTone } from '@/lib/editorial'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ShareButton from '@/app/components/ShareButton'
import NavBar from '@/app/components/NavBar'
import { SkeletonList } from '@/app/components/SkeletonCard'
import { effectiveIsAdmin } from '@/lib/viewRole'
import { useGameNumbers } from '@/lib/useGameNumbers'

const CLUB_BLUE = '#003F6E'

type Player = { id: string; first_name: string; last_name: string; team: string; role?: string; league_id?: string }
type Training = { id: string; date_time: string; location: string }
type Article = {
  id: string
  theme: string
  title: string
  body: string
  author_id: string
  created_at: string
}
type Reaction = { id: string; article_id: string; player_id: string; emoji: string }

const THEMES = [
  { value: 'resume_match', label: 'Résumé de match' },
  { value: 'rumeur_transfert', label: 'Rumeur de transfert' },
  { value: 'interview', label: 'Interview joueur' },
  { value: 'autre', label: 'Autre' },
]


const SUGGESTIONS: Record<string, string[]> = {
  resume_match: [
    "Raconte ce match comme une finale de Coupe Stanley.",
    "Concentre-toi sur la défense qui a fait toute la différence.",
    "Écris ça comme un commentateur qui n'a rien compris au hockey.",
    "Fais un mini classement des 3 moments forts du match.",
    "Adopte le ton d'un vétéran qui a tout vu, tout vécu.",
  ],
  interview: [
    "Pose des questions absurdes sur les habitudes d'avant-match.",
    "Fais une interview façon conférence de presse post-victoire, même après une défaite.",
    "Demande-lui son plus grand regret de la saison, sur le ton de la confidence.",
    "Imagine une interview 'bilan de mi-saison' complètement à côté de la plaque.",
  ],
  rumeur_transfert: [
    "Une rumeur de transfert vers un club totalement improbable.",
    "Un feuilleton mercato avec plusieurs 'sources proches du vestiaire'.",
    "Une rumeur de retraite anticipée démentie dans le même article.",
    "Un cauchemar mercato : il resterait finalement dans l'équipe.",
  ],
  autre: [
    "Un édito sur la nouvelle règle du hors-jeu (ou une règle inventée).",
    "Un top 5 des pires excuses pour sécher l'entraînement.",
    "Une chronique météo appliquée au vestiaire.",
    "Un horoscope du dimanche soir pour chaque poste (attaquant, défenseur, gardien).",
    "Une enquête fictive sur qui a piqué la dernière bière du vestiaire.",
    "Un bilan (parodique) de mi-saison de la ligue.",
  ],
}

function dayIndex(len: number, offset = 0) {
  if (len <= 0) return 0
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  return (dayOfYear + offset) % len
}

function dailySuggestions(theme: string, count = 3): string[] {
  const pool = SUGGESTIONS[theme] || []
  if (pool.length === 0) return []
  const start = dayIndex(pool.length)
  const picked: string[] = []
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    picked.push(pool[(start + i) % pool.length])
  }
  return picked
}

const EMOJIS = ['👏', '🔥', '😂']

export default function GazettePage() {
  const supabase = createClient()
  const gameNumbers = useGameNumbers()
  const [me, setMe] = useState<Player | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTheme, setFilterTheme] = useState<string>('all')

  const [showForm, setShowForm] = useState(false)
  const [genTheme, setGenTheme] = useState('resume_match')
  const [selectedTrainingId, setSelectedTrainingId] = useState('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [instructions, setInstructions] = useState('')
  const [tones, setTones] = useState<EditorialTone[]>(DEFAULT_EDITORIAL.tones)
  const [tone, setTone] = useState(DEFAULT_EDITORIAL.tones[0].key)
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null)
  const [genError, setGenError] = useState('')
  const [publishing, setPublishing] = useState(false)

  const [editingArticleId, setEditingArticleId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    async function loadTones() {
      try {
        const res = await fetch('/api/editorial')
        if (!res.ok) return
        const data = await res.json()
        const list: EditorialTone[] = data.settings?.tones || []
        if (list.length > 0) {
          setTones(list)
          setTone((current) => (list.some((t) => t.key === current) ? current : list[0].key))
        }
      } catch {
        // on garde les tons par défaut
      }
    }
    loadTones()
  }, [])

  async function loadAll() {
    setLoading(true)

    const [userResult, playersResult, trainingsResult, articlesResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('players').select('id, first_name, last_name, team').order('first_name', { ascending: true }),
      supabase.from('trainings').select('id, date_time, location').order('date_time', { ascending: false }),
      supabase.from('articles').select('id, theme, title, body, author_id, created_at').order('created_at', { ascending: false }),
    ])

    const user = userResult.data.user
    setPlayers(playersResult.data || [])
    setTrainings(trainingsResult.data || [])
    setArticles(articlesResult.data || [])

    const articleIds = (articlesResult.data || []).map((a) => a.id)

    const [meResult, reactionsResult] = await Promise.all([
      user
        ? supabase.from('players').select('id, first_name, last_name, team, role, league_id').eq('auth_user_id', user.id).single()
        : Promise.resolve({ data: null }),
      articleIds.length > 0
        ? supabase.from('article_reactions').select('id, article_id, player_id, emoji').in('article_id', articleIds)
        : Promise.resolve({ data: [] }),
    ])

    setMe(meResult.data)
    setReactions(reactionsResult.data || [])

    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
  }, [])

  const filteredArticles = useMemo(() => {
    if (filterTheme === 'all') return articles
    return articles.filter((a) => a.theme === filterTheme)
  }, [articles, filterTheme])

  function playerName(id: string) {
    const p = players.find((pl) => pl.id === id)
    return p ? `${p.first_name} ${p.last_name}` : 'Inconnu'
  }

  function themeLabel(theme: string) {
    return THEMES.find((t) => t.value === theme)?.label || theme
  }

  function reactionsForArticle(articleId: string) {
    return reactions.filter((r) => r.article_id === articleId)
  }

  function myReaction(articleId: string, emoji: string) {
    return reactions.find((r) => r.article_id === articleId && r.player_id === me?.id && r.emoji === emoji)
  }

  async function handleToggleReaction(articleId: string, emoji: string) {
    if (!me) return
    const existing = myReaction(articleId, emoji)
    if (existing) {
      await supabase.from('article_reactions').delete().eq('id', existing.id)
      setReactions((prev) => prev.filter((r) => r.id !== existing.id))
    } else {
      const { data } = await supabase
        .from('article_reactions')
        .insert({ article_id: articleId, player_id: me.id, emoji })
        .select()
        .single()
      if (data) setReactions((prev) => [...prev, data])
    }
  }

  async function handleDeleteArticle(id: string, title: string) {
    if (!confirm(`Supprimer définitivement l'article "${title}" ? Cette action est irréversible.`)) return
    await supabase.from('articles').delete().eq('id', id)
    setArticles((prev) => prev.filter((a) => a.id !== id))
  }

  function handleStartEditArticle(article: Article) {
    setEditingArticleId(article.id)
    setEditTitle(article.title)
    setEditBody(article.body)
  }

  function handleCancelEditArticle() {
    setEditingArticleId(null)
    setEditTitle('')
    setEditBody('')
  }

  async function handleSaveEditArticle(id: string) {
    if (!editTitle.trim() || !editBody.trim()) return
    setSavingEdit(true)
    const { error } = await supabase
      .from('articles')
      .update({ title: editTitle.trim(), body: editBody })
      .eq('id', id)
    setSavingEdit(false)
    if (error) return
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, title: editTitle.trim(), body: editBody } : a)))
    setEditingArticleId(null)
  }

  function togglePlayerSelection(id: string) {
    setSelectedPlayerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleGenerate() {
    setGenError('')
    setGenerating(true)
    setDraft(null)
    try {
      const res = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: genTheme,
          trainingId: genTheme === 'resume_match' ? selectedTrainingId : undefined,
          playerIds: (genTheme === 'rumeur_transfert' || genTheme === 'interview') ? selectedPlayerIds : undefined,
          instructions,
          tone,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setGenError(data.error || "La rédaction n'a pas répondu à temps. Réessaie dans quelques instants.")
      } else {
        setDraft({ title: data.title, body: data.body })
      }
    } catch {
      setGenError('Erreur réseau.')
    } finally {
      setGenerating(false)
    }
  }

  async function handlePublish() {
    if (!draft || !me) return
    setPublishing(true)
    setGenError('')
    const { data, error } = await supabase
      .from('articles')
      .insert({
        theme: genTheme,
        title: draft.title,
        body: draft.body,
        author_id: me.id,
        league_id: me.league_id,
      })
      .select()
      .single()
    setPublishing(false)
    if (error) {
      setGenError(`Erreur publication : ${error.message}`)
      return
    }
    if (data) {
      setArticles((prev) => [data, ...prev])
      setDraft(null)
      setShowForm(false)
      setInstructions('')
      setSelectedPlayerIds([])
      setSelectedTrainingId('')
      setTone(tones[0]?.key ?? DEFAULT_EDITORIAL.tones[0].key)
    }
  }

  if (loading) {
    return (
      <div>
        <NavBar />
        <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
          <SkeletonList count={3} lines={4} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <select
          value={filterTheme}
          onChange={(e) => setFilterTheme(e.target.value)}
          style={{
            width: '100%', maxWidth: 260, padding: '10px 12px', marginBottom: 24,
            border: '1px solid #ccc', borderRadius: 10, background: '#fff', fontSize: 14, color: '#333',
          }}
        >
          <option value="all">Tous les thèmes</option>
          {THEMES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <button
          onClick={() => setShowForm((s) => !s)}
          className="blm-btn-primary"
          style={{ marginBottom: 24 }}
        >
          {showForm ? 'Annuler' : '✍️ Générer un article'}
        </button>

        {me && effectiveIsAdmin(me.role) && (
          <Link
            href="/redaction"
            style={{ display: 'inline-block', marginLeft: 12, marginBottom: 24, fontSize: 13, color: CLUB_BLUE, fontWeight: 600, textDecoration: 'none' }}
          >
            🖋️ Salle de rédaction
          </Link>
        )}

        {showForm && (
          <div className="blm-card" style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Thème</label>
            <select
              value={genTheme}
              onChange={(e) => {
                setGenTheme(e.target.value)
                setDraft(null)
                setGenError('')
              }}
              style={{ width: '100%', padding: 8, marginBottom: 16, borderRadius: 6 }}
            >
              {THEMES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {dailySuggestions(genTheme).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{"Besoin d'inspiration ?"}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {dailySuggestions(genTheme).map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInstructions(s)}
                      style={{
                        padding: '6px 10px', borderRadius: 999, border: `1px solid ${CLUB_BLUE}`,
                        background: '#fff', color: CLUB_BLUE, fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      {s.length > 40 ? s.slice(0, 40) + '…' : s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {genTheme === 'resume_match' && (
              <>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Match</label>
                <select
                  value={selectedTrainingId}
                  onChange={(e) => setSelectedTrainingId(e.target.value)}
                  style={{ width: '100%', padding: 8, marginBottom: 16, borderRadius: 6 }}
                >
                  <option value="">-- Choisir un entraînement --</option>
                  {trainings.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {gameNumbers[tr.id] ? `Match #${gameNumbers[tr.id]} — ` : ''}
                      {new Date(tr.date_time).toLocaleDateString('fr-FR')} — {tr.location}
                    </option>
                  ))}
                </select>
              </>
            )}

            {(genTheme === 'rumeur_transfert' || genTheme === 'interview') && (
              <>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Joueur(s) concerné(s)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, maxHeight: 160, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6, padding: 8 }}>
                  {players.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlayerSelection(p.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        border: `1px solid ${CLUB_BLUE}`,
                        cursor: 'pointer',
                        background: selectedPlayerIds.includes(p.id) ? CLUB_BLUE : '#fff',
                        color: selectedPlayerIds.includes(p.id) ? '#fff' : CLUB_BLUE,
                        fontSize: 13,
                      }}
                    >
                      {p.first_name} {p.last_name}
                    </button>
                  ))}
                </div>
              </>
            )}

            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
              {genTheme === 'autre' ? "Sujet de l'article (obligatoire)" : 'Consignes (optionnel)'}
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={
                genTheme === 'autre'
                  ? "Ex : un édito sur la nouvelle règle du hors-jeu, un top 5 des pires excuses pour sécher l'entraînement..."
                  : 'Ex : sois plus sarcastique, parle du fameux but manqué...'
              }
              style={{ width: '100%', padding: 8, marginBottom: 16, borderRadius: 6, minHeight: 60 }}
            />

            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>{"Ton de l'article"}</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              style={{ width: '100%', padding: 8, marginBottom: 16, borderRadius: 6 }}
            >
              {tones.map((t) => (
                <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>
              ))}
            </select>

            {genError && <p style={{ color: 'red', marginBottom: 12 }}>{genError}</p>}

            <button
              onClick={handleGenerate}
              disabled={generating || (genTheme === 'autre' && !instructions.trim())}
              className="blm-btn-primary"
              style={{ opacity: (generating || (genTheme === 'autre' && !instructions.trim())) ? 0.6 : 1 }}
            >
              {generating ? 'Génération en cours...' : 'Générer'}
            </button>

            {draft && (
              <div style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 16 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                  Aperçu — tu peux ajuster le texte avant de publier
                </div>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft(draft ? { ...draft, title: e.target.value } : draft)}
                  style={{ width: '100%', padding: 8, marginBottom: 10, borderRadius: 6, border: '1px solid #ddd', fontWeight: 'bold', fontSize: 16 }}
                />
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft(draft ? { ...draft, body: e.target.value } : draft)}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', minHeight: 220, lineHeight: 1.5, fontFamily: 'inherit', fontSize: 14 }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${CLUB_BLUE}`, background: '#fff', color: CLUB_BLUE, cursor: 'pointer' }}
                  >
                    Régénérer
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="blm-btn-primary"
                  >
                    {publishing ? 'Publication...' : 'Publier'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {filteredArticles.length === 0 && <p>Aucun article pour le moment.</p>}

        {filteredArticles.map((article) => {
          const lines = article.body.split('\n').filter(Boolean)
          const canEdit = !!me && (me.id === article.author_id || effectiveIsAdmin(me.role))
          const isEditing = editingArticleId === article.id

          return (
            <div key={article.id} className="blm-card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{themeLabel(article.theme)}</div>

              {isEditing ? (
                <>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 6, border: '1px solid #ddd', fontWeight: 'bold', fontSize: 16 }}
                  />
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                    Par {playerName(article.author_id)} · {new Date(article.created_at).toLocaleDateString('fr-FR')}
                  </div>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', minHeight: 180, lineHeight: 1.5, fontFamily: 'inherit', fontSize: 14, marginBottom: 12 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleCancelEditArticle}
                      style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', cursor: 'pointer' }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleSaveEditArticle(article.id)}
                      disabled={savingEdit || !editTitle.trim() || !editBody.trim()}
                      className="blm-btn-primary"
                    >
                      {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 style={{ marginBottom: 4 }}>{article.title}</h3>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                    Par {playerName(article.author_id)} · {new Date(article.created_at).toLocaleDateString('fr-FR')}
                  </div>

                  <div
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: 'hidden',
                      marginBottom: 12,
                    }}
                  >
                    {lines.map((para, i) => (
                      <p key={i} style={{ marginBottom: 12, lineHeight: 1.5 }}>{para}</p>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                    {EMOJIS.map((emoji) => {
                      const count = reactionsForArticle(article.id).filter((r) => r.emoji === emoji).length
                      const active = !!myReaction(article.id, emoji)
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(article.id, emoji)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 20,
                            border: active ? `1px solid ${CLUB_BLUE}` : '1px solid #ddd',
                            background: active ? '#eaf2fa' : '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          {emoji} {count > 0 ? count : ''}
                        </button>
                      )
                    })}

                    <Link
                      href={`/gazette/${article.id}`}
                      style={{ fontSize: 14, color: CLUB_BLUE, fontWeight: 'bold', whiteSpace: 'nowrap', textDecoration: 'none' }}
                    >
                      Lire la suite →
                    </Link>

                    <ShareButton title={article.title} path={`/gazette/${article.id}`} excerpt={lines[0]} />

                    {canEdit && (
                      <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                        <button
                          onClick={() => handleStartEditArticle(article)}
                          aria-label="Modifier l'article"
                          title="Modifier l'article"
                          style={{ background: 'none', border: 'none', color: CLUB_BLUE, cursor: 'pointer', fontSize: 16, padding: 4, lineHeight: 1, flexShrink: 0 }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(article.id, article.title)}
                          aria-label="Supprimer l'article"
                          title="Supprimer l'article"
                          style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1, flexShrink: 0 }}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
