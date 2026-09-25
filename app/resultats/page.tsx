'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/app/components/NavBar'

const CLUB_BLUE = '#003F6E'

type Player = { id: string; role: string }
type Training = { id: string; date_time: string; location: string }
type Result = { id: string; training_id: string; score_noir: number; score_blanc: number }
type Highlight = { id: string; result_id: string; text: string; position: number }
type Challenge = { id: string; title: string; points: number }

export default function ResultatsPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Player | null>(null)
  const [pastTrainings, setPastTrainings] = useState<Training[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedTrainingId, setSelectedTrainingId] = useState('')
  const [scoreNoir, setScoreNoir] = useState('')
  const [scoreBlanc, setScoreBlanc] = useState('')
  const [highlightInputs, setHighlightInputs] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([])
  const [checkedNoir, setCheckedNoir] = useState<string[]>([])
  const [checkedBlanc, setCheckedBlanc] = useState<string[]>([])

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
      } else {
        setHighlights([])
      }
    } else {
      setResults([])
      setHighlights([])
    }

    const { data: challengesData } = await supabase
      .from('challenges')
      .select('id, title, points')
      .eq('status', 'active')
    setActiveChallenges(challengesData || [])

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

  function handleAddHighlightField() {
    setHighlightInputs([...highlightInputs, ''])
  }

  async function handleSubmitResult(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTrainingId) return
    setSaving(true)
    setFormError('')

    const { data: newResult, error } = await supabase
      .from('results')
      .insert({
        training_id: selectedTrainingId,
        score_noir: Number(scoreNoir) || 0,
        score_blanc: Number(scoreBlanc) || 0,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      setFormError(error.message)
      setSaving(false)
      return
    }

    const validHighlights = highlightInputs.filter((h) => h.trim() !== '')
    if (validHighlights.length > 0 && newResult) {
      const { error: highlightsError } = await supabase.from('highlights').insert(
        validHighlights.map((text, i) => ({
          result_id: newResult.id,
          text,
          position: i,
        }))
      )
      if (highlightsError) setFormError(highlightsError.message)
    }

    if (newResult) {
      const rows = [
        ...checkedNoir.map((challenge_id) => ({ result_id: newResult.id, challenge_id, team: 'noir' })),
        ...checkedBlanc.map((challenge_id) => ({ result_id: newResult.id, challenge_id, team: 'blanc' })),
      ]
      if (rows.length > 0) {
        await supabase.from('result_challenges').insert(rows)
      }
    }

    setCheckedNoir([])
    setCheckedBlanc([])
    setSelectedTrainingId('')
    setScoreNoir('')
    setScoreBlanc('')
    setHighlightInputs([''])
    setSaving(false)
    loadAll()
  }

  if (loading) return <p style={{ padding: 40 }}>Chargement...</p>

  const formeColor = (r: string) => (r === 'V' ? '#2E7D5B' : r === 'D' ? '#B23A2E' : '#999')

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <h1 style={{ marginBottom: 24 }}>Résultats</h1>

        {results.length > 0 && (
          <div style={{ border: '1px solid #eee', borderTop: `4px solid ${CLUB_BLUE}`, borderRadius: 20, padding: 20, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
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
          <details style={{ marginBottom: 24, border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Ajouter un résultat</summary>
            <form onSubmit={handleSubmitResult} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <select
                value={selectedTrainingId}
                onChange={(e) => setSelectedTrainingId(e.target.value)}
                required
                style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
              >
                <option value="">Choisir un entraînement passé...</option>
                {trainingsWithoutResult.map((t) => (
                  <option key={t.id} value={t.id}>
                    {new Date(t.date_time).toLocaleDateString('fr-FR')} — {t.location}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label>Score Noir
                  <input type="number" value={scoreNoir} onChange={(e) => setScoreNoir(e.target.value)} required style={{ width: 60, marginLeft: 8, padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
                </label>
                <label>Score Blanc
                  <input type="number" value={scoreBlanc} onChange={(e) => setScoreBlanc(e.target.value)} required style={{ width: 60, marginLeft: 8, padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
                </label>
              </div>

              <div>
                <span style={{ fontSize: 13, color: '#555' }}>Faits saillants</span>
                {highlightInputs.map((h, i) => (
                  <input
                    key={i}
                    placeholder={`Fait saillant ${i + 1}`}
                    value={h}
                    onChange={(e) => {
                      const copy = [...highlightInputs]
                      copy[i] = e.target.value
                      setHighlightInputs(copy)
                    }}
                    style={{ display: 'block', width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6, marginTop: 6 }}
                  />
                ))}
                <button type="button" onClick={handleAddHighlightField} style={{ marginTop: 8, padding: '4px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                  + Ajouter un fait saillant
                </button>
              </div>

              {activeChallenges.length > 0 && (
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>Défis validés — Noir</span>
                    {activeChallenges.map((c) => (
                      <label key={c.id} style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
                        <input
                          type="checkbox"
                          checked={checkedNoir.includes(c.id)}
                          onChange={(e) =>
                            setCheckedNoir(
                              e.target.checked ? [...checkedNoir, c.id] : checkedNoir.filter((id) => id !== c.id)
                            )
                          }
                        />{' '}
                        {c.title} ({c.points} pts)
                      </label>
                    ))}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>Défis validés — Blanc</span>
                    {activeChallenges.map((c) => (
                      <label key={c.id} style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
                        <input
                          type="checkbox"
                          checked={checkedBlanc.includes(c.id)}
                          onChange={(e) =>
                            setCheckedBlanc(
                              e.target.checked ? [...checkedBlanc, c.id] : checkedBlanc.filter((id) => id !== c.id)
                            )
                          }
                        />{' '}
                        {c.title} ({c.points} pts)
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formError && <p style={{ color: '#B23A2E', fontSize: 13 }}>{formError}</p>}

              <button type="submit" disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, background: CLUB_BLUE, color: '#fff', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>
                {saving ? 'Enregistrement...' : 'Enregistrer le résultat'}
              </button>
            </form>
          </details>
        )}

        {results.length === 0 && <p>Aucun résultat enregistré pour le moment.</p>}

        {pastTrainings
          .filter((t) => results.some((r) => r.training_id === t.id))
          .map((training) => {
            const result = results.find((r) => r.training_id === training.id)!
            const matchHighlights = highlights.filter((h) => h.result_id === result.id)

            return (
              <div key={training.id} style={{ border: '1px solid #eee', borderTop: `4px solid ${CLUB_BLUE}`, borderRadius: 20, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
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
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#333' }}>
                    {matchHighlights.map((h) => <li key={h.id}>{h.text}</li>)}
                  </ul>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
