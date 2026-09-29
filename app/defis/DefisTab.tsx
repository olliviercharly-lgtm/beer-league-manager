'use client'

import { SkeletonList } from '@/app/components/SkeletonCard'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { effectiveIsAdmin } from '@/lib/viewRole'

const CLUB_BLUE = '#003F6E'

type Player = { id: string; role: string; league_id: string }
type Challenge = {
  id: string
  icon: string | null
  title: string
  description: string | null
  points: number
  status: string
  proposed_by: string | null
}
type Vote = { id: string; challenge_id: string; player_id: string; vote: string }
type ResultChallenge = { id: string; challenge_id: string; team: string }
type PlayerInfo = { id: string; first_name: string; last_name: string }

export default function DefisTab({ onTotals }: { onTotals?: (t: { noir: number; blanc: number }) => void }) {
  const supabase = createClient()
  const [me, setMe] = useState<Player | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [resultChallenges, setResultChallenges] = useState<ResultChallenge[]>([])
  const [players, setPlayers] = useState<PlayerInfo[]>([])
  const [loading, setLoading] = useState(true)

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPoints, setNewPoints] = useState('150')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPoints, setEditPoints] = useState('0')
  const [editIcon, setEditIcon] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [meResult, challengesResult, resultChallengesResult, playersResult] = await Promise.all([
      supabase.from('players').select('id, role, league_id').eq('auth_user_id', user.id).single(),
      supabase.from('challenges').select('id, icon, title, description, points, status, proposed_by').order('created_at', { ascending: false }),
      supabase.from('result_challenges').select('id, challenge_id, team'),
      supabase.from('players').select('id, first_name, last_name'),
    ])

    setMe(meResult.data)
    setChallenges(challengesResult.data || [])
    setResultChallenges(resultChallengesResult.data || [])
    setPlayers(playersResult.data || [])

    const challengeIds = (challengesResult.data || []).map((c) => c.id)
    if (challengeIds.length > 0) {
      const { data: votesData } = await supabase
        .from('challenge_votes')
        .select('id, challenge_id, player_id, vote')
        .in('challenge_id', challengeIds)
      setVotes(votesData || [])
    } else {
      setVotes([])
    }

    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
  }, [])

  const isAdmin = effectiveIsAdmin(me?.role)
  const activeChallenges = challenges.filter((c) => c.status === 'active')
  const proposedChallenges = challenges.filter((c) => c.status === 'proposed')

  const classement = useMemo(() => {
    let noir = 0
    let blanc = 0
    resultChallenges.forEach((rc) => {
      const challenge = challenges.find((c) => c.id === rc.challenge_id)
      if (challenge) {
        if (rc.team === 'noir') noir += challenge.points
        else if (rc.team === 'blanc') blanc += challenge.points
      }
    })
    const total = noir + blanc || 1
    const pctNoir = Math.round((noir / total) * 100)
    return { noir, blanc, pctNoir }
  }, [resultChallenges, challenges])

  useEffect(() => {
    onTotals?.({ noir: classement.noir, blanc: classement.blanc })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classement.noir, classement.blanc])

  async function handleCreateChallenge(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    const { error } = await supabase.from('challenges').insert({
      league_id: me?.league_id,
      title: newTitle,
      description: newDescription || null,
      points: Number(newPoints) || 0,
      status: isAdmin ? 'active' : 'proposed',
      ...(isAdmin ? {} : { proposed_by: me?.id }),
    })

    if (error) {
      setFormError(error.message)
    } else {
      setNewTitle('')
      setNewDescription('')
      setNewPoints('150')
      loadAll()
    }
    setSaving(false)
  }

  async function handleDeleteChallenge(id: string) {
    await supabase.from('challenges').delete().eq('id', id)
    loadAll()
  }

  function handleStartEdit(c: Challenge) {
    setEditingChallenge(c)
    setEditTitle(c.title)
    setEditDescription(c.description || '')
    setEditPoints(String(c.points))
    setEditIcon(c.icon || '')
    setEditError('')
  }

  function handleCancelEdit() {
    setEditingChallenge(null)
  }

  async function handleSaveEdit() {
    if (!editingChallenge) return
    setEditSaving(true)
    setEditError('')
    const { error } = await supabase
      .from('challenges')
      .update({
        title: editTitle,
        description: editDescription || null,
        points: Number(editPoints) || 0,
        icon: editIcon || null,
      })
      .eq('id', editingChallenge.id)

    if (error) {
      setEditError(error.message)
      setEditSaving(false)
    } else {
      setEditSaving(false)
      setEditingChallenge(null)
      loadAll()
    }
  }

  async function handleValidateProposal(id: string) {
    await supabase.from('challenges').update({ status: 'active' }).eq('id', id)
    loadAll()
  }

  async function handleRejectProposal(id: string) {
    await supabase.from('challenges').delete().eq('id', id)
    loadAll()
  }

  async function handleVote(challengeId: string, voteValue: 'for' | 'against') {
    if (!me) return
    const existing = votes.find((v) => v.challenge_id === challengeId && v.player_id === me.id)
    let error = null
    if (existing) {
      const res = await supabase.from('challenge_votes').update({ vote: voteValue }).eq('id', existing.id)
      error = res.error
    } else {
      const res = await supabase.from('challenge_votes').insert({ challenge_id: challengeId, player_id: me.id, vote: voteValue })
      error = res.error
    }
    if (error) {
      console.error('Erreur vote:', error)
      alert('Erreur lors du vote : ' + error.message)
      return
    }
    loadAll()
  }

  function handleShareWhatsApp(c: Challenge) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/defis#challenge-${c.id}`
    const message = `🏒 Nouveau défi proposé : "${c.title}" — Va voter ici 👉 ${url}`
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  if (loading) return <SkeletonList count={3} lines={2} />

  return (
    <>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Défis officiels</h2>
        {activeChallenges.length === 0 && <p style={{ color: '#666' }}>Aucun défi officiel pour le moment.</p>}
        {activeChallenges.map((c) => (
          <div
            key={c.id}
            className="blm-card"
            style={{
              marginBottom: 12,
              borderTop: `4px solid ${CLUB_BLUE}`,
              paddingTop: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>
                {c.icon ? `${c.icon} ` : ''}{c.title}
                <span style={{ color: CLUB_BLUE, fontWeight: 'bold', marginLeft: 8 }}>{c.points} pts</span>
              </div>
              {c.description && <p style={{ fontSize: 13, color: '#666', margin: '6px 0 0' }}>{c.description}</p>}
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleStartEdit(c)}
                  title="Modifier"
                  style={{
                    border: `1px solid ${CLUB_BLUE}`, color: CLUB_BLUE, background: 'none', borderRadius: 8,
                    width: 32, height: 32, cursor: 'pointer', fontSize: 14,
                  }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteChallenge(c.id)}
                  title="Supprimer"
                  style={{
                    border: '1px solid #B23A2E', color: '#B23A2E', background: 'none', borderRadius: 8,
                    width: 32, height: 32, cursor: 'pointer', fontSize: 14,
                  }}
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        ))}

        <details style={{ marginBottom: 32, marginTop: 16 }}>
          <summary
            style={{
              listStyle: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              borderRadius: 999,
              border: `1.5px solid ${CLUB_BLUE}`,
              color: CLUB_BLUE,
              fontWeight: 700,
              fontSize: 15,
              background: '#F5F9FC',
              userSelect: 'none',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>➕</span>
            {isAdmin ? 'Nouveau défi' : 'Proposer un défi'}
          </summary>
          <form
            onSubmit={handleCreateChallenge}
            style={{
              display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12,
              border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fff',
            }}
          >
            <input
              placeholder="Titre du défi"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
            />
            <textarea
              placeholder="Description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
            />
            <label>Points
              <input type="number" value={newPoints} onChange={(e) => setNewPoints(e.target.value)} style={{ width: 80, marginLeft: 8, padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
            </label>
            {formError && <p style={{ color: '#B23A2E', fontSize: 13 }}>{formError}</p>}
            <button type="submit" disabled={saving} className="blm-btn-primary" style={{ alignSelf: 'flex-start' }}>
              {saving ? 'Enregistrement...' : isAdmin ? 'Ajouter à la liste officielle' : 'Proposer ce défi'}
            </button>
          </form>
        </details>

        {proposedChallenges.length > 0 && (
          <>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Défis proposés — à voter</h2>
            {proposedChallenges.map((c) => {
              const challengeVotes = votes.filter((v) => v.challenge_id === c.id)
              const pourCount = challengeVotes.filter((v) => v.vote === 'for').length
              const pct = challengeVotes.length > 0 ? Math.round((pourCount / challengeVotes.length) * 100) : 0
              const myVote = challengeVotes.find((v) => v.player_id === me?.id)

              const proposer = players.find((p) => p.id === c.proposed_by)
              const contreCount = challengeVotes.length - pourCount

              return (
                <div
                  key={c.id}
                  id={`challenge-${c.id}`}
                  className="blm-card"
                  style={{ marginBottom: 16, borderTop: `4px solid ${CLUB_BLUE}`, paddingTop: 16, scrollMarginTop: 80 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 19, fontWeight: 'bold' }}>
                      {c.icon && <span>{c.icon}</span>}
                      <span>{c.title}</span>
                    </div>
                    <button
                      onClick={() => handleShareWhatsApp(c)}
                      title="Partager sur WhatsApp pour faire voter"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                        border: '1px solid #25D366', color: '#1F9955', background: '#F0FBF5',
                        borderRadius: 999, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      }}
                    >
                      📲 Partager
                    </button>
                  </div>
                  {c.description && (
                    <p style={{ fontSize: 14, color: '#555', margin: '0 0 8px', lineHeight: 1.5 }}>{c.description}</p>
                  )}
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                    Proposé par {proposer ? `${proposer.first_name} ${proposer.last_name}` : 'un joueur'} · {c.points} pts suggérés
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <button
                      onClick={() => handleVote(c.id, 'for')}
                      style={{
                        flex: 1, padding: '14px 12px', borderRadius: 12, cursor: 'pointer',
                        fontSize: 15, fontWeight: myVote?.vote === 'for' ? 700 : 500,
                        border: myVote?.vote === 'for' ? '1.5px solid #2E7D5B' : '1.5px solid #ddd',
                        background: myVote?.vote === 'for' ? '#DFF3E7' : '#fff',
                        color: myVote?.vote === 'for' ? '#1F6B45' : '#555',
                      }}
                    >
                      👍 Pour
                    </button>
                    <button
                      onClick={() => handleVote(c.id, 'against')}
                      style={{
                        flex: 1, padding: '14px 12px', borderRadius: 12, cursor: 'pointer',
                        fontSize: 15, fontWeight: myVote?.vote === 'against' ? 700 : 500,
                        border: myVote?.vote === 'against' ? '1.5px solid #B23A2E' : '1.5px solid #ddd',
                        background: myVote?.vote === 'against' ? '#FBE4E1' : '#fff',
                        color: myVote?.vote === 'against' ? '#B23A2E' : '#555',
                      }}
                    >
                      👎 Contre
                    </button>
                  </div>

                  <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', marginBottom: 8, background: '#eee' }}>
                    <div style={{ width: `${pct}%`, background: '#2E7D5B' }} />
                    <div style={{ width: `${100 - pct}%`, background: '#B23A2E' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666', marginBottom: isAdmin ? 16 : 0 }}>
                    <span>{pourCount} pour · {contreCount} contre</span>
                    <span style={{ fontWeight: 'bold', color: '#333' }}>{pct}% pour ({challengeVotes.length} votants)</span>
                  </div>

                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => handleValidateProposal(c.id)}
                        className="blm-btn-primary"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        ✓ Valider ce défi
                      </button>
                      <button
                        onClick={() => handleRejectProposal(c.id)}
                        style={{
                          flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #B23A2E',
                          background: '#fff', color: '#B23A2E', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        🗑️ Rejeter
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

      {editingChallenge && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
          }}
          onClick={handleCancelEdit}
        >
          <div className="blm-card" style={{ maxWidth: 420, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 'bold', fontSize: 18 }}>Modifier le défi</div>
              <button
                onClick={handleCancelEdit}
                style={{ border: '1px solid #ddd', borderRadius: '50%', width: 32, height: 32, background: '#fff', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '12px 0' }} />

            <div style={{ fontSize: 12, color: '#999', fontWeight: 'bold', marginBottom: 6 }}>ICÔNE (emoji)</div>
            <input
              value={editIcon}
              onChange={(e) => setEditIcon(e.target.value)}
              placeholder="🏆"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 16 }}
            />

            <div style={{ fontSize: 12, color: '#999', fontWeight: 'bold', marginBottom: 6 }}>TITRE</div>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 16 }}
            />

            <div style={{ fontSize: 12, color: '#999', fontWeight: 'bold', marginBottom: 6 }}>DESCRIPTION</div>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 16 }}
            />

            <div style={{ fontSize: 12, color: '#999', fontWeight: 'bold', marginBottom: 6 }}>POINTS</div>
            <input
              type="number"
              value={editPoints}
              onChange={(e) => setEditPoints(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 16 }}
            />

            {editError && <p style={{ color: '#B23A2E', fontSize: 13, marginBottom: 12 }}>{editError}</p>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleCancelEdit} className="blm-pill" style={{ flex: 1, justifyContent: 'center' }}>
                Annuler
              </button>
              <button onClick={handleSaveEdit} disabled={editSaving} className="blm-btn-primary" style={{ flex: 1 }}>
                {editSaving ? '...' : '✓ Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
