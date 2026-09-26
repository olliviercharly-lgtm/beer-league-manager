'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/app/components/NavBar'

const CLUB_BLUE = '#003F6E'

type Player = { id: string; first_name: string; last_name: string; team: string; is_admin?: boolean; role?: string }
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
]

const EMOJIS = ['👏', '🔥', '😂']

export default function GazettePage() {
  const supabase = createClient()
  const [me, setMe] = useState<Player | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTheme, setFilterTheme] = useState<string>('all')
  const [expandedIds, setExpandedIds] = useState<string[]>([])

  const [showForm, setShowForm] = useState(false)
  const [genTheme, setGenTheme] = useState('resume_match')
  const [selectedTrainingId, setSelectedTrainingId] = useState('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [instructions, setInstructions] = useState('')
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null)
  const [genError, setGenError] = useState('')
  const [publishing, setPublishing] = useState(false)

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('players')
        .select('id, first_name, last_name, team, is_admin, role')
        .eq('auth_user_id', user.id)
        .single()
      setMe(data)
    }

    const { data: playersData } = await supabase
      .from('players')
      .select('id, first_name, last_name, team')
      .order('first_name', { ascending: true })
    setPlayers(playersData || [])

    const { data: trainingsData } = await supabase
      .from('trainings')
      .select('id, date_time, location')
      .order('date_time', { ascending: false })
    setTrainings(trainingsData || [])

    const { data: articlesData } = await supabase
      .from('articles')
      .select('id, theme, title, body, author_id, created_at')
      .order('created_at', { ascending: false })
    setArticles(articlesData || [])

    const articleIds = (articlesData || []).map((a) => a.id)
    if (articleIds.length > 0) {
      const { data: reactionsData } = await supabase
        .from('article_reactions')
        .select('id, article_id, player_id, emoji')
        .in('article_id', articleIds)
      setReactions(reactionsData || [])
    } else {
      setReactions([])
    }

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

  function toggleExpand(id: string) {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
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

  async function handleDeleteArticle(id: string) {
    if (!confirm('Supprimer cet article ?')) return
    await supabase.from('articles').delete().eq('id', id)
    setArticles((prev) => prev.filter((a) => a.id !== id))
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
          playerIds: genTheme !== 'resume_match' ? selectedPlayerIds : undefined,
          instructions,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenError(data.error || 'Erreur de génération.')
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
    const { data, error } = await supabase
      .from('articles')
      .insert({
        theme: genTheme,
        title: draft.title,
        body: draft.body,
        author_id: me.id,
      })
      .select()
      .single()
    setPublishing(false)
    if (!error && data) {
      setArticles((prev) => [data, ...prev])
      setDraft(null)
      setShowForm(false)
      setInstructions('')
      setSelectedPlayerIds([])
      setSelectedTrainingId('')
    }
  }

  if (loading) {
    return (
      <div>
        <NavBar />
        <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
          Chargement...
        </div>
      </div>
    )
  }

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <h1 style={{ marginBottom: 16 }}>La Gazette</h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterTheme('all')}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${CLUB_BLUE}`, cursor: 'pointer', background: filterTheme === 'all' ? CLUB_BLUE : '#fff', color: filterTheme === 'all' ? '#fff' : CLUB_BLUE }}
          >
            Tous
          </button>
          {THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterTheme(t.value)}
              style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${CLUB_BLUE}`, cursor: 'pointer', background: filterTheme === t.value ? CLUB_BLUE : '#fff', color: filterTheme === t.value ? '#fff' : CLUB_BLUE }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowForm((s) => !s)}
          style={{ marginBottom: 24, padding: '10px 16px', borderRadius: 8, border: 'none', background: CLUB_BLUE, color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {showForm ? 'Annuler' : '✍️ Générer un article'}
        </button>

        {showForm && (
          <div style={{ border: '1px solid #ccc', borderRadius: 12, padding: 16, marginBottom: 24 }}>
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

            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Consignes (optionnel)</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex : sois plus sarcastique, parle du fameux but manqué..."
              style={{ width: '100%', padding: 8, marginBottom: 16, borderRadius: 6, minHeight: 60 }}
            />

            {genError && <p style={{ color: 'red', marginBottom: 12 }}>{genError}</p>}

            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: CLUB_BLUE, color: '#fff', cursor: 'pointer', fontWeight: 'bold', opacity: generating ? 0.6 : 1 }}
            >
              {generating ? 'Génération en cours...' : 'Générer'}
            </button>

            {draft && (
              <div style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 16 }}>
                <h3 style={{ marginBottom: 8 }}>{draft.title}</h3>
                {draft.body.split('\n').filter(Boolean).map((para, i) => (
                  <p key={i} style={{ marginBottom: 12, lineHeight: 1.5 }}>{para}</p>
                ))}
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
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: CLUB_BLUE, color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
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
          const isExpanded = expandedIds.includes(article.id)
          const visibleLines = isExpanded ? lines : lines.slice(0, 10)
          const canDelete = me && (me.id === article.author_id || me.is_admin || me.role === 'admin')

          return (
            <div key={article.id} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{themeLabel(article.theme)}</div>
              <h3 style={{ marginBottom: 4 }}>{article.title}</h3>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                Par {playerName(article.author_id)} · {new Date(article.created_at).toLocaleDateString('fr-FR')}
              </div>

              {visibleLines.map((para, i) => (
                <p key={i} style={{ marginBottom: 12, lineHeight: 1.5 }}>{para}</p>
              ))}

              {lines.length > 10 && (
                <button
                  onClick={() => toggleExpand(article.id)}
                  style={{ background: 'none', border: 'none', color: CLUB_BLUE, cursor: 'pointer', padding: 0, marginBottom: 12, fontWeight: 'bold' }}
                >
                  {isExpanded ? 'Voir moins' : 'Voir plus'}
                </button>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
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

                {canDelete && (
                  <button
                    onClick={() => handleDeleteArticle(article.id)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#c00', cursor: 'pointer' }}
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
