'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/app/components/NavBar'
import { SkeletonList } from '@/app/components/SkeletonCard'
import PlayerModal from './PlayerModal'
import { useLeagueTeams, getContrastText } from '@/lib/useLeagueTeams'
import { loadBeerCounts, packsLabel, seasonLabel } from '@/lib/beerStats'

type Player = {
  id: string
  auth_user_id: string
  first_name: string
  last_name: string
  number: number | null
  team: string
  position: string
}

type AttendanceRow = { player_id: string; training_id: string; status: string; team: string | null }
type ResultRow = { training_id: string; score_noir: number; score_blanc: number }

const CLUB_BLUE = '#003F6E'
const CLUB_GOLD = '#C9A227'

function VestiaireContent() {
  const supabase = createClient()
  const teams = useLeagueTeams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const openPlayerId = searchParams.get('player')
  const openEditing = searchParams.get('edit') === '1'

  const [me, setMe] = useState<{ id: string } | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [results, setResults] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [beerCounts, setBeerCounts] = useState<Record<string, number>>({})
  const [showFullBeerRanking, setShowFullBeerRanking] = useState(false)
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState<'all' | 'noir' | 'blanc'>('all')
  const [positionFilter, setPositionFilter] = useState<'all' | 'attaquant' | 'defenseur' | 'gardien'>('all')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [meResult, playersResult, attendanceResult, resultsResult, beerResult] = await Promise.all([
        supabase.from('players').select('id').eq('auth_user_id', user.id).single(),
        supabase.from('players').select('id, auth_user_id, first_name, last_name, number, team, position').order('first_name', { ascending: true }),
        supabase.from('attendance').select('player_id, training_id, status, team').eq('status', 'present'),
        supabase.from('results').select('training_id, score_noir, score_blanc'),
        loadBeerCounts(supabase),
      ])

      setMe(meResult.data)
      setPlayers(playersResult.data || [])
      setAttendance(attendanceResult.data || [])
      setResults(resultsResult.data || [])
      setBeerCounts(beerResult)

      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  const statsByPlayer = useMemo(() => {
    const map: Record<string, { matches: number; victoires: number }> = {}
    const resultsByTraining: Record<string, ResultRow> = {}
    results.forEach((r) => { resultsByTraining[r.training_id] = r })

    attendance.forEach((a) => {
      const player = players.find((p) => p.id === a.player_id)
      if (!player) return
      const result = resultsByTraining[a.training_id]
      if (!result) return
      if (!map[a.player_id]) map[a.player_id] = { matches: 0, victoires: 0 }
      map[a.player_id].matches += 1
      const effectiveTeam = a.team ?? player.team
      const mine = effectiveTeam === 'noir' ? result.score_noir : result.score_blanc
      const other = effectiveTeam === 'noir' ? result.score_blanc : result.score_noir
      if (mine > other) map[a.player_id].victoires += 1
    })

    return map
  }, [attendance, results, players])

  const filtered = useMemo(() => {
    let list = [...players]

    if (teamFilter !== 'all') list = list.filter((p) => p.team === teamFilter)
    if (positionFilter !== 'all') list = list.filter((p) => p.position === positionFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q))
    }

    list.sort((a, b) => {
      if (a.id === me?.id) return -1
      if (b.id === me?.id) return 1
      return 0
    })

    return list
  }, [players, teamFilter, positionFilter, search, me])

  const beerRanking = useMemo(() => {
    const ranked = players
      .map((p) => ({ player: p, count: beerCounts[p.id] || 0 }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count || a.player.first_name.localeCompare(b.player.first_name))
    // Rang partagé en cas d'égalité (deux joueurs à 4 packs sont tous les deux 2e)
    const withRanks: { player: Player; count: number; rank: number }[] = []
    for (let i = 0; i < ranked.length; i++) {
      const sameAsPrevious = i > 0 && ranked[i].count === ranked[i - 1].count
      withRanks.push({ ...ranked[i], rank: sameAsPrevious ? withRanks[i - 1].rank : i + 1 })
    }
    return withRanks
  }, [players, beerCounts])

  function openPlayer(id: string, edit?: boolean) {
    router.push(`/vestiaire?player=${id}${edit ? '&edit=1' : ''}`, { scroll: false })
  }

  function closeModal() {
    router.push('/vestiaire', { scroll: false })
  }

  if (loading) {
    return (
      <div>
        <NavBar />
        <div style={{ maxWidth: 720, margin: '32px auto 40px', fontFamily: 'sans-serif', padding: '0 16px' }}>
          <SkeletonList count={4} lines={2} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <div className="blm-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>🍺 Les mécènes de la saison</div>
            <div style={{ fontSize: 12, color: '#888' }}>Saison {seasonLabel()}</div>
          </div>
          {beerRanking.length === 0 ? (
            <div style={{ fontSize: 14, color: '#666' }}>
              Aucun pack ramené pour l&apos;instant cette saison. Le premier mécène entrera dans la légende.
            </div>
          ) : (
            <>
              {(showFullBeerRanking ? beerRanking : beerRanking.filter((r) => r.rank <= 3)).map((r) => {
                const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `${r.rank}.`
                const isMeRow = r.player.id === me?.id
                return (
                  <div
                    key={r.player.id}
                    onClick={() => openPlayer(r.player.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                      background: isMeRow ? '#FBF3DD' : 'transparent',
                    }}
                  >
                    <span style={{ width: 28, textAlign: 'center', fontSize: r.rank <= 3 ? 20 : 14, fontWeight: 700, color: '#666', flexShrink: 0 }}>{medal}</span>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: r.rank === 1 ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.player.first_name} {r.player.last_name}
                      {isMeRow && <span style={{ fontSize: 11, color: '#8A6D1A', marginLeft: 6 }}>(moi)</span>}
                    </span>
                    <span style={{ fontWeight: 700, color: '#8A6D1A', whiteSpace: 'nowrap' }}>{packsLabel(r.count)}</span>
                  </div>
                )
              })}
              {beerRanking.some((r) => r.rank > 3) && (
                <button
                  type="button"
                  onClick={() => setShowFullBeerRanking((v) => !v)}
                  style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, color: CLUB_BLUE, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  {showFullBeerRanking ? 'Réduire ▴' : 'Voir le classement complet ▾'}
                </button>
              )}
            </>
          )}
        </div>

        <div className="blm-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <input
            placeholder="Rechercher un joueur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 20, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value as 'all' | 'noir' | 'blanc')}
              style={{ flex: 1, minWidth: 140, padding: '10px 12px', border: '1px solid #ccc', borderRadius: 10, background: '#fff', fontSize: 14, color: '#333' }}
            >
              <option value="all">Toutes équipes</option>
              <option value="noir">{teams.noirName}</option>
              <option value="blanc">{teams.blancName}</option>
            </select>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value as 'all' | 'attaquant' | 'defenseur' | 'gardien')}
              style={{ flex: 1, minWidth: 140, padding: '10px 12px', border: '1px solid #ccc', borderRadius: 10, background: '#fff', fontSize: 14, color: '#333' }}
            >
              <option value="all">Tous postes</option>
              <option value="attaquant">Attaquant</option>
              <option value="defenseur">Défenseur</option>
              <option value="gardien">Gardien</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {filtered.map((player) => {
            const isMe = player.id === me?.id
            const initials = `${player.first_name[0] || ''}${player.last_name[0] || ''}`.toUpperCase()
            const isNoir = player.team === 'noir'
            const stats = statsByPlayer[player.id] || { matches: 0, victoires: 0 }
            const ratio = stats.matches > 0 ? Math.round((stats.victoires / stats.matches) * 100) : 0

            return (
              <div key={player.id} className="blm-card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        width: 56, height: 56, borderRadius: 14, background: CLUB_BLUE, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18,
                      }}
                    >
                      {initials}
                    </div>
                    {player.number != null && (
                      <span
                        style={{
                          position: 'absolute', bottom: -8, left: -8, background: CLUB_GOLD, color: '#1A1A1A',
                          fontSize: 12, fontWeight: 'bold', padding: '2px 8px', borderRadius: 10,
                        }}
                      >
                        #{player.number}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      background: isNoir ? teams.noirColor : teams.blancColor,
                      color: getContrastText(isNoir ? teams.noirColor : teams.blancColor),
                      border: '1px solid rgba(0,0,0,0.12)', fontSize: 12, fontWeight: 600,
                      padding: '4px 12px', borderRadius: 20,
                    }}
                  >
                    {isNoir ? teams.noirName : teams.blancName}
                  </span>
                </div>

                <div
                  style={{ fontWeight: 'bold', fontSize: 16, display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, cursor: 'pointer' }}
                  onClick={() => openPlayer(player.id)}
                >
                  {player.first_name} {player.last_name}
                  {isMe && (
                    <span style={{ background: '#EEE', color: '#666', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>
                      Moi
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                  {player.position === 'attaquant' ? 'Attaquant' : player.position === 'defenseur' ? 'Défenseur' : 'Gardien'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', padding: '12px 0', marginBottom: 12 }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 18 }}>{stats.matches}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>Matches</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 18 }}>{stats.victoires}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>Victoires</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 18 }}>{ratio}%</div>
                    <div style={{ fontSize: 11, color: '#888' }}>Ratio V/D</div>
                  </div>
                </div>

                {(beerCounts[player.id] || 0) > 0 && (
                  <div style={{ textAlign: 'center', fontSize: 13, color: '#8A6D1A', fontWeight: 600, marginTop: -4, marginBottom: 12 }}>
                    🍺 {packsLabel(beerCounts[player.id])} cette saison
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 13 }}>
                  <button
                    onClick={() => openPlayer(player.id)}
                    style={{ color: CLUB_GOLD, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600 }}
                  >
                    {isMe ? 'Voir ma fiche' : 'Voir sa fiche'}
                  </button>
                  {isMe && (
                    <button
                      onClick={() => openPlayer(player.id, true)}
                      style={{ color: CLUB_GOLD, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600 }}
                    >
                      ✏️ Modifier ma fiche
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && <p style={{ marginTop: 24, color: '#666' }}>Aucun joueur ne correspond à ces critères.</p>}
      </div>

      {openPlayerId && (
        <PlayerModal key={openPlayerId} playerId={openPlayerId} initialEditing={openEditing} onClose={closeModal} />
      )}
    </div>
  )
}

export default function VestiairePage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 720, margin: '32px auto 40px', padding: '0 16px' }}><SkeletonList count={4} lines={2} /></div>}>
      <VestiaireContent />
    </Suspense>
  )
}
