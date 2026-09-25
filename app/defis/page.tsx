'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/app/components/NavBar'

const CLUB_BLUE = '#003F6E'

type Player = { id: string; role: string }
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

export default function DefisPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Player | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [resultChallenges, setResultChallenges] = useState<ResultChallenge[]>([])
  const [loading, setLoading] = useState(true)

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPoints, setNewPoints] = useState('150')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: meData } = await supabase
      .from('players')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()
    setMe(meData)

    const { data: challengesData } = await supabase
      .from('challenges')
      .select('id, icon, title, description, points, status, proposed_by')
      .order('created_at', { ascending: false })
    setChallenges(challengesData || [])

    const challengeIds = (challengesData || []).map((c) => c.id)
    if (challengeIds.length > 0) {
      const { data: votesData } = await supabase
        .from('challenge_votes')
        .select('id, challenge_id, player_id, vote')
        .in('challenge_id', challengeIds)
      setVotes(votesData || [])
    } else {
      setVotes([])
    }

    const { data: resultChallengesData } = await supabase
      .from('result_challenges')
      .select('id, challenge_id, team')
    setResultChallenges(resultChallengesData || [])

    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
  }, [])

  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin'
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

  async function handleCreateChallenge(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    const { error } = await supabase.from('challenges').insert({
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

  async function handleValidateProposal(id: string) {
    await supabase.from('challenges').update({ status: 'active' }).eq('id', id)
    loadAll()
  }

  async function handleRejectProposal(id: string) {
    await supabase.from('challenges').delete().eq('id', id)
    loadAll()
  }

  async function handleVote(challengeId: string, voteValue: 'pour' | 'contre') {
    if (!me) return
    const existing = votes.find((v) => v.challenge_id === challengeId && v.player_id === me.id)
    if (existing) {
      await supabase.from('challenge_votes').update({ vote: voteValue }).eq('id', existing.id)
    } else {
      await supabase.from('challenge_votes').insert({ challenge_id: challengeId, player_id: me.id, vote: voteValue })
    }
    loadAll()
  }

  if (loading) return <p style={{ padding: 40 }}>Chargement...</p>

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <h1 style={{ marginBottom: 24 }}>Défis</h1>

        <div style={{ border: '1px solid #eee', borderTop: `4px solid ${CLUB_BLUE}`, borderRadius: 20, padding: 20, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
            <span>Noir — {classement.noir} pts</span>
            <span>Blanc — {classement.blanc} pts</span>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${classement.pctNoir}%`, background: '#111' }} />
            <div style={{ width: `${100 - classement.pctNoir}%`, background: '#ccc' }} />
          </div>
        </div>

        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Défis officiels</h2>
        {activeChallenges.length === 0 && <p style={{ color: '#666' }}>Aucun défi officiel pour le moment.</p>}
        {activeChallenges.map((c) => (
          <div key={c.id} style={{ border: '1px solid #eee', borderTop: `4px solid ${CLUB_BLUE}`, borderRadius: 16, padding: 14, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{c.icon ? `${c.icon} ` : ''}{c.title}</strong>
              <span style={{ color: CLUB_BLUE, fontWeight: 'bold' }}>{c.points} pts</span>
            </div>
            {c.description && <p style={{ fontSize: 14, color: '#555', margin: '6px 0 0' }}>{c.description}</p>}
            {isAdmin && (
              <button
                onClick={() => handleDeleteChallenge(c.id)}
                style={{ marginTop: 8, fontSize: 12, color: '#B23A2E', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Supprimer
              </button>
            )}
          </div>
        ))}

        <details style={{ marginBottom: 32, marginTop: 16, border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
            {isAdmin ? 'Nouveau défi' : 'Proposer un défi'}
          </summary>
          <form onSubmit={handleCreateChallenge} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
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
            <button type="submit" disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, background: CLUB_BLUE, color: '#fff', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>
              {saving ? 'Enregistrement...' : isAdmin ? 'Ajouter à la liste officielle' : 'Proposer ce défi'}
            </button>
          </form>
        </details>

        {proposedChallenges.length > 0 && (
          <>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Défis proposés — à voter</h2>
            {proposedChallenges.map((c) => {
              const challengeVotes = votes.filter((v) => v.challenge_id === c.id)
              const pourCount = challengeVotes.filter((v) => v.vote === 'pour').length
              const pct = challengeVotes.length > 0 ? Math.round((pourCount / challengeVotes.length) * 100) : 0
              const myVote = challengeVotes.find((v) => v.player_id === me?.id)

              return (
                <div key={c.id} style={{ border: '1px solid #eee', borderTop: `4px solid ${CLUB_BLUE}`, borderRadius: 16, padding: 14, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{c.title}</strong>
                    <span style={{ color: CLUB_BLUE, fontWeight: 'bold' }}>{c.points} pts</span>
                  </div>
                  {c.description && <p style={{ fontSize: 14, color: '#555', margin: '6px 0' }}>{c.description}</p>}
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                    {challengeVotes.length} votant(s) · {pct}% pour
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleVote(c.id, 'pour')}
                      style={{
                        padding: '6px 12px', borderRadius: 6, border: '1px solid #2E7D5B', cursor: 'pointer',
                        background: myVote?.vote === 'pour' ? '#2E7D5B' : '#fff',
                        color: myVote?.vote === 'pour' ? '#fff' : '#2E7D5B',
                      }}
                    >
                      Pour
                    </button>
                    <button
                      onClick={() => handleVote(c.id, 'contre')}
                      style={{
                        padding: '6px 12px', borderRadius: 6, border: '1px solid #B23A2E', cursor: 'pointer',
                        background: myVote?.vote === 'contre' ? '#B23A2E' : '#fff',
                        color: myVote?.vote === 'contre' ? '#fff' : '#B23A2E',
                      }}
                    >
                      Contre
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleValidateProposal(c.id)}
                          style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 6, border: 'none', background: CLUB_BLUE, color: '#fff', cursor: 'pointer' }}
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => handleRejectProposal(c.id)}
                          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #999', background: '#fff', color: '#666', cursor: 'pointer' }}
                        >
                          Rejeter
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
