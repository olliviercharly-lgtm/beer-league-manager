'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { effectiveIsAdmin } from '@/lib/viewRole'

const CLUB_BLUE = '#003F6E'

const BADGE_CATALOG = [
  { key: 'five_in_a_row', icon: '🔥', label: '5 à la suite', description: '5 victoires consécutives', points: 200, dynamic: false },
  { key: 'grand_chelem', icon: '🏆', label: 'Grand Chelem', description: 'Tous les défis validés au moins une fois', points: 500, dynamic: false },
  { key: 'double_defi', icon: '2️⃣', label: 'Double Défi', description: '2 défis validés sur le même match : leurs points sont doublés (x2)', points: 0, dynamic: true },
  { key: 'triple_defi', icon: '3️⃣', label: 'Triple Défi', description: '3 défis ou plus validés sur le même match : leurs points sont triplés (x3)', points: 0, dynamic: true },
  { key: 'cap_100', icon: '🥉', label: 'Cap des 100 buts', description: 'Première équipe à atteindre 100 buts sur la saison', points: 100, dynamic: false },
  { key: 'cap_200', icon: '🥈', label: 'Cap des 200 buts', description: 'Première équipe à atteindre 200 buts sur la saison', points: 200, dynamic: false },
  { key: 'cap_300', icon: '🥇', label: 'Cap des 300 buts', description: 'Première équipe à atteindre 300 buts sur la saison', points: 300, dynamic: false },
  { key: 'black_streak', icon: '🤡', label: 'Série Noire', description: '5 défaites consécutives (ça arrive aux meilleurs)', points: -200, dynamic: false },
]

type Player = { id: string; role: string; league_id: string }
type Result = { id: string; training_id: string; score_noir: number; score_blanc: number }
type Training = { id: string; date_time: string }
type ResultChallenge = { id: string; result_id: string; challenge_id: string; team: string }
type ChallengeInfo = { id: string; points: number }
type Override = { id: string; badge_key: string; team: string; status: string; points: number | null }

export default function BadgesTab({ onTotals }: { onTotals?: (t: { noir: number; blanc: number }) => void }) {
  const supabase = createClient()
  const [me, setMe] = useState<Player | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [resultChallenges, setResultChallenges] = useState<ResultChallenge[]>([])
  const [challengeInfos, setChallengeInfos] = useState<ChallengeInfo[]>([])
  const [activeChallengeCount, setActiveChallengeCount] = useState(0)
  const [overrides, setOverrides] = useState<Override[]>([])
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState<{ badgeKey: string; team: 'noir' | 'blanc' } | null>(null)
  const [pointsInput, setPointsInput] = useState('0')
  const [statusInput, setStatusInput] = useState<'auto' | 'validé' | 'non_validé'>('auto')
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: meData } = await supabase
      .from('players')
      .select('id, role, league_id')
      .eq('auth_user_id', user.id)
      .single()
    setMe(meData)

    const { data: resultsData } = await supabase
      .from('results')
      .select('id, training_id, score_noir, score_blanc')
    setResults(resultsData || [])

    const trainingIds = (resultsData || []).map((r) => r.training_id)
    if (trainingIds.length > 0) {
      const { data: trainingsData } = await supabase
        .from('trainings')
        .select('id, date_time')
        .in('id', trainingIds)
      setTrainings(trainingsData || [])
    } else {
      setTrainings([])
    }

    const resultIds = (resultsData || []).map((r) => r.id)
    if (resultIds.length > 0) {
      const { data: rcData } = await supabase
        .from('result_challenges')
        .select('id, result_id, challenge_id, team')
        .in('result_id', resultIds)
      setResultChallenges(rcData || [])
    } else {
      setResultChallenges([])
    }

    const { data: challengesData } = await supabase
      .from('challenges')
      .select('id, points')
    setChallengeInfos(challengesData || [])

    const { count } = await supabase
      .from('challenges')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
    setActiveChallengeCount(count || 0)

    if (meData) {
      const { data: overridesData } = await supabase
        .from('badge_overrides')
        .select('id, badge_key, team, status, points')
        .eq('league_id', meData.league_id)
      setOverrides(overridesData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
  }, [])

  const isAdmin = effectiveIsAdmin(me?.role)

  const computed = useMemo(() => {
    const ordered = results
      .map((r) => ({ ...r, training: trainings.find((t) => t.id === r.training_id) }))
      .filter((r) => r.training)
      .sort((a, b) => new Date(a.training!.date_time).getTime() - new Date(b.training!.date_time).getTime())

    function outcome(r: typeof ordered[number], team: 'noir' | 'blanc') {
      const mine = team === 'noir' ? r.score_noir : r.score_blanc
      const other = team === 'noir' ? r.score_blanc : r.score_noir
      if (mine > other) return 'V'
      if (mine < other) return 'D'
      return 'N'
    }

    function maxStreak(team: 'noir' | 'blanc', outcomeLetter: 'V' | 'D') {
      let max = 0
      let current = 0
      ordered.forEach((r) => {
        if (outcome(r, team) === outcomeLetter) {
          current++
          max = Math.max(max, current)
        } else {
          current = 0
        }
      })
      return max
    }

    function totalGoals(team: 'noir' | 'blanc') {
      return ordered.reduce((sum, r) => sum + (team === 'noir' ? r.score_noir : r.score_blanc), 0)
    }

    function firstToReach(threshold: number): 'noir' | 'blanc' | null {
      let cumNoir = 0
      let cumBlanc = 0
      for (const r of ordered) {
        cumNoir += r.score_noir
        cumBlanc += r.score_blanc
        const noirReached = cumNoir >= threshold
        const blancReached = cumBlanc >= threshold
        if (noirReached && !blancReached) return 'noir'
        if (blancReached && !noirReached) return 'blanc'
        if (noirReached && blancReached) {
          return r.score_noir >= r.score_blanc ? 'noir' : 'blanc'
        }
      }
      return null
    }

    const distinctChallenges = (team: 'noir' | 'blanc') =>
      new Set(resultChallenges.filter((rc) => rc.team === team).map((rc) => rc.challenge_id)).size

    const challengePoints: Record<string, number> = {}
    challengeInfos.forEach((c) => { challengePoints[c.id] = c.points })

    function multiInfo(team: 'noir' | 'blanc', minCount: number, maxCount: number | null) {
      for (const r of ordered) {
        const ids = new Set(
          resultChallenges
            .filter((rc) => rc.result_id === r.id && rc.team === team)
            .map((rc) => rc.challenge_id)
        )
        const count = ids.size
        if (count >= minCount && (maxCount === null || count <= maxCount)) {
          let sum = 0
          ids.forEach((id) => { sum += challengePoints[id] || 0 })
          return { unlocked: true, sum }
        }
      }
      return { unlocked: false, sum: 0 }
    }

    const doubleNoir = multiInfo('noir', 2, 2)
    const doubleBlanc = multiInfo('blanc', 2, 2)
    const tripleNoir = multiInfo('noir', 3, null)
    const tripleBlanc = multiInfo('blanc', 3, null)

    const cap100Team = firstToReach(100)
    const cap200Team = firstToReach(200)
    const cap300Team = firstToReach(300)

    const autoStatus: Record<string, Record<string, boolean>> = {
      noir: {
        five_in_a_row: maxStreak('noir', 'V') >= 5,
        black_streak: maxStreak('noir', 'D') >= 5,
        grand_chelem: activeChallengeCount > 0 && distinctChallenges('noir') >= activeChallengeCount,
        double_defi: doubleNoir.unlocked,
        triple_defi: tripleNoir.unlocked,
        cap_100: cap100Team === 'noir',
        cap_200: cap200Team === 'noir',
        cap_300: cap300Team === 'noir',
      },
      blanc: {
        five_in_a_row: maxStreak('blanc', 'V') >= 5,
        black_streak: maxStreak('blanc', 'D') >= 5,
        grand_chelem: activeChallengeCount > 0 && distinctChallenges('blanc') >= activeChallengeCount,
        double_defi: doubleBlanc.unlocked,
        triple_defi: tripleBlanc.unlocked,
        cap_100: cap100Team === 'blanc',
        cap_200: cap200Team === 'blanc',
        cap_300: cap300Team === 'blanc',
      },
    }

    const dynamicPoints: Record<string, Record<string, number>> = {
      noir: { double_defi: doubleNoir.sum, triple_defi: tripleNoir.sum * 2 },
      blanc: { double_defi: doubleBlanc.sum, triple_defi: tripleBlanc.sum * 2 },
    }

    return { autoStatus, dynamicPoints, totalGoalsNoir: totalGoals('noir'), totalGoalsBlanc: totalGoals('blanc') }
  }, [results, trainings, resultChallenges, challengeInfos, activeChallengeCount])

  function getOverride(badgeKey: string, team: string) {
    return overrides.find((o) => o.badge_key === badgeKey && o.team === team)
  }

  function defaultPoints(badge: typeof BADGE_CATALOG[number], team: 'noir' | 'blanc') {
    return badge.dynamic ? computed.dynamicPoints[team][badge.key] || 0 : badge.points
  }

  function isUnlocked(badgeKey: string, team: 'noir' | 'blanc') {
    const override = getOverride(badgeKey, team)
    if (override?.status === 'validé') return true
    if (override?.status === 'non_validé') return false
    return computed.autoStatus[team][badgeKey]
  }

  function effectivePoints(badge: typeof BADGE_CATALOG[number], team: 'noir' | 'blanc') {
    const override = getOverride(badge.key, team)
    return override?.points ?? defaultPoints(badge, team)
  }

  const totalPoints = useMemo(() => {
    const totals = { noir: 0, blanc: 0 }
    BADGE_CATALOG.forEach((b) => {
      ;(['noir', 'blanc'] as const).forEach((team) => {
        if (isUnlocked(b.key, team)) totals[team] += effectivePoints(b, team)
      })
    })
    return totals
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed, overrides])

  useEffect(() => {
    onTotals?.({ noir: totalPoints.noir, blanc: totalPoints.blanc })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPoints.noir, totalPoints.blanc])

  function openEditor(badgeKey: string, team: 'noir' | 'blanc') {
    const badge = BADGE_CATALOG.find((b) => b.key === badgeKey)!
    const override = getOverride(badgeKey, team)
    setPointsInput(String(override?.points ?? defaultPoints(badge, team)))
    setStatusInput(override?.status === 'validé' || override?.status === 'non_validé' ? override.status : 'auto')
    setSelected({ badgeKey, team })
  }

  async function handleSaveBadge() {
    if (!selected) return
    setSaving(true)
    const badge = BADGE_CATALOG.find((b) => b.key === selected.badgeKey)!
    const defaultPts = defaultPoints(badge, selected.team)
    const pointsNum = Number(pointsInput) || 0
    const pointsChanged = pointsNum !== defaultPts
    const existing = getOverride(selected.badgeKey, selected.team)

    if (statusInput === 'auto' && !pointsChanged) {
      if (existing) await supabase.from('badge_overrides').delete().eq('id', existing.id)
    } else if (existing) {
      await supabase.from('badge_overrides').update({
        status: statusInput,
        points: pointsChanged ? pointsNum : null,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('badge_overrides').insert({
        league_id: me?.league_id,
        badge_key: selected.badgeKey,
        team: selected.team,
        status: statusInput,
        points: pointsChanged ? pointsNum : null,
        updated_at: new Date().toISOString(),
      })
    }
    setSaving(false)
    setSelected(null)
    loadAll()
  }

  if (loading) return <p style={{ padding: 40 }}>Chargement...</p>

  const selectedBadge = selected ? BADGE_CATALOG.find((b) => b.key === selected.badgeKey) : null

  return (
    <>
      <h2 style={{ fontSize: 18, margin: '32px 0 12px' }}>🏅 Badges de la saison</h2>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
        Débloqués automatiquement dès qu&apos;une équipe remplit la condition.
      </p>

      {(['noir', 'blanc'] as const).map((team) => (
        <div key={team} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 'bold', color: '#999', letterSpacing: 1, marginBottom: 10 }}>
            {team === 'noir' ? 'NOIR' : 'BLANC'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {BADGE_CATALOG.map((b) => {
              const unlocked = isUnlocked(b.key, team)
              const pts = effectivePoints(b, team)
              return (
                <div
                  key={b.key}
                  className="blm-card"
                  style={{
                    textAlign: 'center',
                    position: 'relative',
                    borderRadius: 16,
                    border: unlocked ? '2px solid #2E7D5B' : undefined,
                    boxShadow: unlocked ? '0 0 0 3px rgba(46,125,91,0.12)' : undefined,
                  }}
                >
                  {unlocked && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: '#2E7D5B',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                      }}
                    >
                      ✓
                    </div>
                  )}
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: unlocked ? '#EAF2FB' : '#F2F2F2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      margin: '0 auto 10px',
                      filter: unlocked ? 'none' : 'grayscale(1)',
                      opacity: unlocked ? 1 : 0.6,
                    }}
                  >
                    {b.icon}
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: 15 }}>{b.label}</div>
                  <div style={{ fontSize: 13, color: '#666', margin: '4px 0 10px' }}>{b.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {unlocked ? (
                      <span style={{ fontWeight: 'bold', color: pts >= 0 ? CLUB_BLUE : '#B23A2E' }}>
                        {pts >= 0 ? '+' : ''}{pts} pts
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#999' }}>Non débloqué</span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => openEditor(b.key, team)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}
                        aria-label="Modifier le badge"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
        Buts marqués cette saison — Noir : {computed.totalGoalsNoir} · Blanc : {computed.totalGoalsBlanc}
      </p>

      {selected && selectedBadge && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
          }}
          onClick={() => setSelected(null)}
        >
          <div className="blm-card" style={{ maxWidth: 420, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EAF2FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  {selectedBadge.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 18 }}>Modifier le badge</div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    {selectedBadge.label} — {selected.team === 'noir' ? 'Noir' : 'Blanc'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ border: '1px solid #ddd', borderRadius: '50%', width: 32, height: 32, background: '#fff', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '12px 0' }} />

            <div style={{ fontSize: 12, color: '#999', fontWeight: 'bold', marginBottom: 6 }}>POINTS ATTRIBUÉS</div>
            <input
              type="number"
              value={pointsInput}
              onChange={(e) => setPointsInput(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 16, background: '#F5F5F5' }}
            />

            <div style={{ fontSize: 12, color: '#999', fontWeight: 'bold', marginBottom: 6 }}>
              STATUT POUR {selected.team === 'noir' ? 'NOIR' : 'BLANC'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button
                onClick={() => setStatusInput('auto')}
                className={statusInput === 'auto' ? 'blm-pill-active' : 'blm-pill'}
                style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', padding: '10px 8px' }}
              >
                <span>🔄 Auto</span>
                <span style={{ fontSize: 11 }}>
                  ({computed.autoStatus[selected.team][selected.badgeKey] ? 'validé' : 'non validé'})
                </span>
              </button>
              <button
                onClick={() => setStatusInput('validé')}
                className={statusInput === 'validé' ? 'blm-pill-active' : 'blm-pill'}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                ✅ Validé
              </button>
              <button
                onClick={() => setStatusInput('non_validé')}
                className={statusInput === 'non_validé' ? 'blm-pill-active' : 'blm-pill'}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                🚫 Non validé
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setSelected(null)} className="blm-pill" style={{ flex: 1, justifyContent: 'center' }}>
                Annuler
              </button>
              <button onClick={handleSaveBadge} disabled={saving} className="blm-btn-primary" style={{ flex: 1 }}>
                {saving ? '...' : '✓ Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
