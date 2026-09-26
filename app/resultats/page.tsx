'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/app/components/NavBar'
import MatchModal from './MatchModal'

const CLUB_BLUE = '#003F6E'

type Player = { id: string; role: string }
type Training = { id: string; date_time: string; location: string }
type Result = { id: string; training_id: string; score_noir: number; score_blanc: number }
type Highlight = { id: string; result_id: string; text: string; position: number }
type Challenge = { id: string; icon: string; title: string; description: string; points: number; status: string }
type ResultChallenge = { id: string; result_id: string; challenge_id: string; team: string }

export default function ResultatsPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Player | null>(null)
  const [pastTrainings, setPastTrainings] = useState<Training[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [resultChallenges, setResultChallenges] = useState<ResultChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTrainingId, setActiveTrainingId] = useState<string | null>(null)

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: meData } = await supabase
      .from('players')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()
    setMe(meData)

    const { data: trainingsData } = await supabase
      .from('trainings')
      .select('id, date_time, location')
      .lt('date_time', new Date().toISOString())
      .order('date_time', { ascending: false })
    setPastTrainings(trainingsData || [])

    const trainingIds = (trainingsData || []).map((t) => t.id)
    if (trainingIds.length > 0) {
      const { data: resultsData } = await supabase
        .from('results')
        .select('id, training_id, score_noir, score_blanc')
        .in('training_id', trainingIds)
      setResults(resultsData || [])

      const resultIds = (resultsData || []).map((r) => r.id)
      if (resultIds.length > 0) {
        const { data: highlightsData } = await supabase
          .from('highlights')
          .select('id, result_id, text, position')
          .in('result_id', resultIds)
          .order('position', { ascending: true })
        setHighlights(highlightsData || [])

        const { data: resultChallengesData } = await supabase
          .from('result_challenges')
          .select('id, result_id, challenge_id, team')
          .in('result_id', resultIds)
        setResultChallenges(resultChallengesData || [])
      } else {
        setHighlights([])
        setResultChallenges([])
      }
    } else {
      setResults([])
      setHighlights([])
      setResultChallenges([])
    }

    const { data: challengesData } = await supabase
      .from('challenges')
      .select('id, icon, title, description, points, status')
    setChallenges(challengesData || [])

    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
  }, [])

  const trainingsWithoutResult = useMemo(
    () => pastTrainings.filter((t) => !results.some((r) => r.training_id === t.id)),
    [pastTrainings, results]
  )

  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin'

  const seasonStats = useMemo(() => {
    let winsNoir = 0
    let winsBlanc = 0
    let goalsNoir = 0
    let goalsBlanc = 0

    const orderedResults = [...results]
      .map((r) => ({ ...r, training: pastTrainings.find((t) => t.id === r.training_id) }))
      .filter((r) => r.training)
      .sort((a, b) => new Date(a.training!.date_time).getTime() - new Date(b.training!.date_time).getTime())

    orderedResults.forEach((r) => {
      goalsNoir += r.score_noir
      goalsBlanc += r.score_blanc
      if (r.score_noir > r.score_blanc) winsNoir++
      else if (r.score_blanc > r.score_noir) winsBlanc++
    })

    const formeNoir = orderedResults.slice(-5).map((r) =>
      r.score_noir > r.score_blanc ? 'V' : r.score_noir < r.score_blanc ? 'D' : 'N'
    )
    const formeBlanc = orderedResults.slice(-5).map((r) =>
      r.score_blanc > r.score_noir ? 'V' : r.score_blanc < r.score_noir ? 'D' : 'N'
    )

    const totalMatches = winsNoir + winsBlanc || 1
    const pctNoir = Math.round((winsNoir / totalMatches) * 100)

    return { winsNoir, winsBlanc, goalsNoir, goalsBlanc, formeNoir, formeBlanc, pctNoir }
  }, [results, pastTrainings])

  async function handleDeleteResult(id: string) {
    if (!confirm('Supprimer ce résultat ? Cette action est irréversible.')) return
    await supabase.from('result_challenges').delete().eq('result_id', id)
    await supabase.from('highlights').delete().eq('result_id', id)
    await supabase.from('results').delete().eq('id', id)
    loadAll()
  }

  if (loading) return <p style={{ padding: 40 }}>Chargement...</p>

  const formeColor = (r: string) => (r === 'V' ? '#2E7D5B' : r === 'D' ? '#B23A2E' : '#999')

  const activeTraining = pastTrainings.find((t) => t.id === activeTrainingId) || null
  const activeResult = activeTraining ? results.find((r) => r.training_id === activeTraining.id) || null : null
  const activeHighlights = activeResult ? highlights.filter((h) => h.result_id === activeResult.id) : []
  const activeResultChallenges = activeResult ? resultChallenges.filter((rc) => rc.result_id === activeResult.id) : []

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <h1 style={{ marginBottom: 24, color: CLUB_BLUE, fontSize: 26 }}>Résultats</h1>

        {results.length > 0 && (
          <div className="blm-card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
              <span>Noir — {seasonStats.winsNoir} victoire(s) ({seasonStats.goalsNoir}b)</span>
              <span>Blanc — {seasonStats.winsBlanc} victoire(s) ({seasonStats.goalsBlanc}b)</span>
            </div>
            <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ width: `${seasonStats.pctNoir}%`, background: '#111' }} />
              <div style={{ width: `${100 - seasonStats.pctNoir}%`, background: '#ccc' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 13, color: '#666' }}>Forme Noir : </span>
                {seasonStats.formeNoir.map((r, i) => (
                  <span key={i} style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: formeColor(r), marginLeft: 4 }} />
                ))}
              </div>
              <div>
                <span style={{ fontSize: 13, color: '#666' }}>Forme Blanc : </span>
                {seasonStats.formeBlanc.map((r, i) => (
                  <span key={i} style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: formeColor(r), marginLeft: 4 }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {isAdmin && trainingsWithoutResult.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {trainingsWithoutResult.map((t) => (
              <div key={t.id} className="blm-card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
                  {new Date(t.date_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {t.location}
                </div>
                <button
                  onClick={() => setActiveTrainingId(t.id)}
                  className="blm-btn-primary"
                  style={{ width: '100%' }}
                >
                  🏆 Feuille de Match &amp; Résultats
                </button>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && <p>Aucun résultat enregistré pour le moment.</p>}

        {pastTrainings
          .filter((t) => results.some((r) => r.training_id === t.id))
          .map((training) => {
            const result = results.find((r) => r.training_id === training.id)!
            const matchHighlights = highlights.filter((h) => h.result_id === result.id)
            const matchChallenges = resultChallenges.filter((rc) => rc.result_id === result.id)

            return (
              <div key={training.id} className="blm-card" style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                  {new Date(training.date_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {training.location}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ background: '#111', color: '#fff', borderRadius: 8, padding: '6px 14px', fontWeight: 'bold', fontSize: 18 }}>
                    {result.score_noir}
                  </span>
                  <span style={{ color: '#999' }}>-</span>
                  <span style={{ background: '#fff', color: '#111', border: '1px solid #111', borderRadius: 8, padding: '6px 14px', fontWeight: 'bold', fontSize: 18 }}>
                    {result.score_blanc}
                  </span>
                </div>

                {matchHighlights.length > 0 && (
                  <div style={{ fontSize: 15, color: '#1A1A1A', lineHeight: 1.6, marginBottom: matchChallenges.length > 0 ? 12 : 0 }}>
                    {matchHighlights.map((h) => (
                      <div key={h.id} style={{ marginBottom: 8 }}>• {h.text}</div>
                    ))}
                  </div>
                )}

                {matchChallenges.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: isAdmin ? 12 : 0 }}>
                    {matchChallenges.map((rc) => {
                      const challenge = challenges.find((c) => c.id === rc.challenge_id)
                      if (!challenge) return null
                      return (
                        <span
                          key={rc.id}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, border: '1px solid #ccc', fontSize: 13, color: '#333' }}
                        >
                          ✓ {challenge.title} <em style={{ fontStyle: 'italic', color: '#777' }}>({rc.team === 'noir' ? 'Noir' : 'Blanc'})</em>
                        </span>
                      )
                    })}
                  </div>
                )}

                {isAdmin && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button
                      onClick={() => setActiveTrainingId(training.id)}
                      className="blm-pill"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      🏆 Feuille de Match &amp; Résultats
                    </button>
                    <button
                      onClick={() => handleDeleteResult(result.id)}
                      style={{ background: 'none', border: 'none', color: '#B23A2E', cursor: 'pointer', fontSize: 12 }}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {activeTraining && (
        <MatchModal
          training={activeTraining}
          result={activeResult}
          highlights={activeHighlights}
          resultChallenges={activeResultChallenges}
          challenges={challenges}
          onClose={() => setActiveTrainingId(null)}
          onSaved={loadAll}
        />
      )}
    </div>
  )
}
