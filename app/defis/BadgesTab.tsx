'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const CLUB_BLUE = '#003F6E'

const BADGE_CATALOG = [
  { key: 'five_in_a_row', label: '5 à la suite', description: '5 victoires consécutives', points: 200 },
  { key: 'black_streak', label: 'Série Noire', description: '5 défaites consécutives', points: -200 },
  { key: 'grand_chelem', label: 'Grand Chelem', description: 'Tous les défis validés au moins une fois', points: 300 },
  { key: 'cap_100', label: '100 buts', description: 'Première équipe à atteindre 100 buts marqués sur la saison', points: 150 },
  { key: 'cap_200', label: '200 buts', description: 'Première équipe à atteindre 200 buts marqués sur la saison', points: 200 },
  { key: 'cap_300', label: '300 buts', description: 'Première équipe à atteindre 300 buts marqués sur la saison', points: 250 },
]

type Player = { id: string; role: string; league_id: string }
type Result = { id: string; training_id: string; score_noir: number; score_blanc: number }
type Training = { id: string; date_time: string }
type ResultChallenge = { id: string; result_id: string; challenge_id: string; team: string }
type Override = { id: string; badge_key: string; team: string; status: string; points: number | null }

export default function BadgesTab() {
  const supabase = createClient()
  const [me, setMe] = useState<Player | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [resultChallenges, setResultChallenges] = useState<ResultChallenge[]>([])
  const [activeChallengeCount, setActiveChallengeCount] = useState(0)
  const [overrides, setOverrides] = useState<Override[]>([])
  const [loading, setLoading] = useState(true)

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

  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin'

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

    const cap100Team = firstToReach(100)
    const cap200Team = firstToReach(200)
    const cap300Team = firstToReach(300)

    const autoStatus: Record<string, Record<string, boolean>> = {
      noir: {
        five_in_a_row: maxStreak('noir', 'V') >= 5,
        black_streak: maxStreak('noir', 'D') >= 5,
        grand_chelem: activeChallengeCount > 0 && distinctChallenges('noir') >= activeChallengeCount,
        cap_100: cap100Team === 'noir',
        cap_200: cap200Team === 'noir',
        cap_300: cap300Team === 'noir',
      },
      blanc: {
        five_in_a_row: maxStreak('blanc', 'V') >= 5,
        black_streak: maxStreak('blanc', 'D') >= 5,
        grand_chelem: activeChallengeCount > 0 && distinctChallenges('blanc') >= activeChallengeCount,
        cap_100: cap100Team === 'blanc',
        cap_200: cap200Team === 'blanc',
        cap_300: cap300Team === 'blanc',
      },
    }

    return { autoStatus, totalGoalsNoir: totalGoals('noir'), totalGoalsBlanc: totalGoals('blanc') }
  }, [results, trainings, resultChallenges, activeChallengeCount])

  function getOverride(badgeKey: string, team: string) {
    return overrides.find((o) => o.badge_key === badgeKey && o.team === team)
  }

  function isUnlocked(badgeKey: string, team: 'noir' | 'blanc') {
    const override = getOverride(badgeKey, team)
    if (override?.status === 'validé') return true
    if (override?.status === 'non_validé') return false
    return computed.autoStatus[team][badgeKey]
  }

  function badgePoints(badgeKey: string, team: string, defaultPoints: number) {
    const override = getOverride(badgeKey, team)
    return override?.points ?? defaultPoints
  }

  const totalPoints = useMemo(() => {
    const totals = { noir: 0, blanc: 0 }
    BADGE_CATALOG.forEach((b) => {
      ;(['noir', 'blanc'] as const).forEach((team) => {
        if (isUnlocked(b.key, team)) totals[team] += badgePoints(b.key, team, b.points)
      })
    })
    return totals
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed, overrides])

  async function setOverrideStatus(badgeKey: string, team: string, status: 'validé' | 'non_validé' | 'auto') {
    const existing = getOverride(badgeKey, team)
    if (status === 'auto') {
      if (existing) await supabase.from('badge_overrides').delete().eq('id', existing.id)
    } else if (existing) {
      await supabase.from('badge_overrides').update({ status, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('badge_overrides').insert({
        league_id: me?.league_id,
        badge_key: badgeKey,
        team,
        status,
        updated_at: new Date().toISOString(),
      })
    }
    loadAll()
  }

  if (loading) return <p style={{ padding: 40 }}>Chargement...</p>

  const total = totalPoints.noir + totalPoints.blanc || 1
  const pctNoir = Math.round((totalPoints.noir / total) * 100)

  return (
    <>
      <div style={{ border: '1px solid #eee', borderTop: `4px solid ${CLUB_BLUE}`, borderRadius: 20, padding: 20, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
            <span>Noir — {totalPoints.noir} pts de badges</span>
            <span>Blanc — {totalPoints.blanc} pts de badges</span>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${pctNoir}%`, background: '#111' }} />
            <div style={{ width: `${100 - pctNoir}%`, background: '#ccc' }} />
          </div>
        </div>

        {BADGE_CATALOG.map((b) => (
          <div key={b.key} style={{ border: '1px solid #eee', borderTop: `4px solid ${CLUB_BLUE}`, borderRadius: 16, padding: 14, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 'bold' }}>{b.label}</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>{b.description} · {b.points} pts</div>

            <div style={{ display: 'flex', gap: 16 }}>
              {(['noir', 'blanc'] as const).map((team) => {
                const unlocked = isUnlocked(b.key, team)
                const override = getOverride(b.key, team)
                return (
                  <div
                    key={team}
                    style={{
                      flex: 1, padding: 10, borderRadius: 12,
                      border: unlocked ? '2px solid #2E7D5B' : '1px solid #ddd',
                      background: unlocked ? '#f2f9f5' : '#fafafa',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block', background: team === 'noir' ? '#111' : '#fff', border: '1px solid #111' }} />
                      {team === 'noir' ? 'Noir' : 'Blanc'} — {unlocked ? 'Débloqué ✓' : 'Non débloqué'}
                    </div>
                    {override && <div style={{ fontSize: 11, color: '#B23A2E', marginTop: 2 }}>statut forcé : {override.status}</div>}
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        <button onClick={() => setOverrideStatus(b.key, team, 'validé')} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid #2E7D5B', background: '#fff', cursor: 'pointer' }}>Valider</button>
                        <button onClick={() => setOverrideStatus(b.key, team, 'non_validé')} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid #B23A2E', background: '#fff', cursor: 'pointer' }}>Invalider</button>
                        <button onClick={() => setOverrideStatus(b.key, team, 'auto')} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid #999', background: '#fff', cursor: 'pointer' }}>Auto</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <p style={{ fontSize: 12, color: '#999', marginTop: 24 }}>
          Buts marqués cette saison — Noir : {computed.totalGoalsNoir} · Blanc : {computed.totalGoalsBlanc}
        </p>
    </>
  )
}
