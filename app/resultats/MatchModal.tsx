'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const CLUB_BLUE = '#003F6E'

type Training = { id: string; date_time: string; location: string }
type ResultRow = { id: string; training_id: string; score_noir: number; score_blanc: number }
type Highlight = { id: string; result_id: string; text: string; position: number }
type Challenge = { id: string; icon: string; title: string; description: string; points: number; status: string }
type ResultChallenge = { id: string; result_id: string; challenge_id: string; team: string }

type Props = {
  training: Training
  result: ResultRow | null
  highlights: Highlight[]
  resultChallenges: ResultChallenge[]
  challenges: Challenge[]
  onClose: () => void
  onSaved: () => void
}

export default function MatchModal({ training, result, highlights, resultChallenges, challenges, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [scoreNoir, setScoreNoir] = useState(result ? String(result.score_noir) : '')
  const [scoreBlanc, setScoreBlanc] = useState(result ? String(result.score_blanc) : '')
  const [highlightInputs, setHighlightInputs] = useState<string[]>(
    highlights.length > 0 ? highlights.map((h) => h.text) : ['']
  )
  const [selections, setSelections] = useState<Record<string, { noir: boolean; blanc: boolean }>>(() => {
    const init: Record<string, { noir: boolean; blanc: boolean }> = {}
    challenges.forEach((c) => {
      init[c.id] = {
        noir: resultChallenges.some((rc) => rc.challenge_id === c.id && rc.team === 'noir'),
        blanc: resultChallenges.some((rc) => rc.challenge_id === c.id && rc.team === 'blanc'),
      }
    })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleTeam(challengeId: string, team: 'noir' | 'blanc') {
    setSelections((prev) => ({
      ...prev,
      [challengeId]: { ...prev[challengeId], [team]: !prev[challengeId]?.[team] },
    }))
  }

  function handleAddHighlight() {
    setHighlightInputs([...highlightInputs, ''])
  }

  function handleRemoveHighlight(i: number) {
    setHighlightInputs(highlightInputs.filter((_, idx) => idx !== i))
  }

  function handleHighlightChange(i: number, value: string) {
    const copy = [...highlightInputs]
    copy[i] = value
    setHighlightInputs(copy)
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    let resultId = result?.id

    if (resultId) {
      await supabase
        .from('results')
        .update({
          score_noir: Number(scoreNoir) || 0,
          score_blanc: Number(scoreBlanc) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resultId)
    } else {
      const { data: newResult, error: insertError } = await supabase
        .from('results')
        .insert({
          training_id: training.id,
          score_noir: Number(scoreNoir) || 0,
          score_blanc: Number(scoreBlanc) || 0,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError || !newResult) {
        setError(insertError?.message || 'Erreur lors de la création du résultat.')
        setSaving(false)
        return
      }
      resultId = newResult.id
    }

    await supabase.from('highlights').delete().eq('result_id', resultId)
    const validHighlights = highlightInputs.filter((h) => h.trim() !== '')
    if (validHighlights.length > 0) {
      await supabase.from('highlights').insert(
        validHighlights.map((text, i) => ({ result_id: resultId, text, position: i }))
      )
    }

    await supabase.from('result_challenges').delete().eq('result_id', resultId)
    const challengeRows: { result_id: string; challenge_id: string; team: string }[] = []
    Object.entries(selections).forEach(([challengeId, sel]) => {
      if (sel.noir) challengeRows.push({ result_id: resultId!, challenge_id: challengeId, team: 'noir' })
      if (sel.blanc) challengeRows.push({ result_id: resultId!, challenge_id: challengeId, team: 'blanc' })
    })
    if (challengeRows.length > 0) {
      await supabase.from('result_challenges').insert(challengeRows)
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  function statusLabel(sel: { noir: boolean; blanc: boolean } | undefined) {
    if (!sel || (!sel.noir && !sel.blanc)) return 'Non validé'
    if (sel.noir && sel.blanc) return 'Validé — Noir & Blanc'
    if (sel.noir) return 'Validé — Noir'
    return 'Validé — Blanc'
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, maxWidth: 520, width: '100%', boxShadow: '0 8px 30px rgba(0,0,0,0.25)', position: 'relative' }}
      >
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ background: '#EAF1FB', borderRadius: 12, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                🏆
              </div>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#111', lineHeight: 1.2 }}>
                Feuille de Match &amp; Résultats
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <span style={{ background: '#EAF1FB', color: CLUB_BLUE, borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 }}>
              CLÔTURE DE SÉANCE
            </span>
          </div>

          <div style={{ fontSize: 14, color: '#666', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #eee' }}>
            ENTRAÎNEMENT · {new Date(training.date_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {training.location}
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Noir</div>
              <input
                type="number"
                value={scoreNoir}
                onChange={(e) => setScoreNoir(e.target.value)}
                style={{ width: '100%', background: '#F5F5F5', border: 'none', borderRadius: 10, padding: 14, fontSize: 22, fontWeight: 'bold', textAlign: 'center' }}
              />
            </div>
            <div style={{ fontSize: 20, color: '#999', marginTop: 20 }}>—</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Blanc</div>
              <input
                type="number"
                value={scoreBlanc}
                onChange={(e) => setScoreBlanc(e.target.value)}
                style={{ width: '100%', background: '#F5F5F5', border: 'none', borderRadius: 10, padding: 14, fontSize: 22, fontWeight: 'bold', textAlign: 'center' }}
              />
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5, marginBottom: 10 }}>FAITS SAILLANTS</div>
          {highlightInputs.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                placeholder={`Fait saillant ${i + 1}`}
                value={h}
                onChange={(e) => handleHighlightChange(i, e.target.value)}
                style={{ flex: 1, background: '#F5F5F5', border: 'none', borderRadius: 10, padding: 12, fontSize: 14 }}
              />
              <button
                type="button"
                onClick={() => handleRemoveHighlight(i)}
                style={{ width: 40, borderRadius: 10, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', color: '#B23A2E' }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddHighlight}
            className="blm-pill"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 24, color: CLUB_BLUE, borderColor: CLUB_BLUE }}
          >
            + Ajouter un fait saillant
          </button>

          <div style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5, marginBottom: 12 }}>
            DÉFIS D&apos;ÉQUIPE À VALIDER (LES DEUX ÉQUIPES PEUVENT VALIDER LE MÊME DÉFI)
          </div>

          {challenges.map((c) => {
            const sel = selections[c.id]
            const validated = sel && (sel.noir || sel.blanc)
            return (
              <div
                key={c.id}
                style={{ border: validated ? `2px solid ${CLUB_BLUE}` : '1px solid #eee', borderRadius: 14, padding: 14, marginBottom: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{c.icon}</span>
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>{c.title}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span style={{ background: '#EAF1FB', color: CLUB_BLUE, borderRadius: 999, padding: '3px 10px', fontSize: 12 }}>
                        👥 Défi d&apos;Équipe
                      </span>
                      <span style={{ background: '#F0F0F0', color: '#555', borderRadius: 999, padding: '3px 10px', fontSize: 12 }}>
                        +{c.points} pts
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>{c.description}</div>
                    <div style={{ fontSize: 13, fontWeight: 'bold', color: validated ? CLUB_BLUE : '#999' }}>
                      {statusLabel(sel)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => toggleTeam(c.id, 'noir')}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 999,
                        border: sel?.noir ? 'none' : '1px solid #ccc',
                        background: sel?.noir ? '#111' : '#fff',
                        color: sel?.noir ? '#fff' : '#666',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: sel?.noir ? 'bold' : 'normal',
                      }}
                    >
                      Noir
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTeam(c.id, 'blanc')}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 999,
                        border: sel?.blanc ? 'none' : '1px solid #ccc',
                        background: sel?.blanc ? '#ddd' : '#fff',
                        color: '#333',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: sel?.blanc ? 'bold' : 'normal',
                      }}
                    >
                      Blanc
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {error && <p style={{ color: '#B23A2E', fontSize: 13, marginTop: 8 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 15 }}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="blm-btn-primary"
              style={{ flex: 1.5 }}
            >
              {saving ? 'Enregistrement...' : '✓ Enregistrer la Feuille de Match & Clôturer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
