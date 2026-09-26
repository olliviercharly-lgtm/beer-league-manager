'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/app/components/NavBar'
import PlayerModal from './PlayerModal'

type Player = {
  id: string
  auth_user_id: string
  first_name: string
  last_name: string
  number: number | null
  team: string
  position: string
}

type AttendanceRow = { player_id: string; training_id: string; status: string }
type ResultRow = { training_id: string; score_noir: number; score_blanc: number }

const CLUB_BLUE = '#003F6E'
const CLUB_GOLD = '#C9A227'

function VestiaireContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const openPlayerId = searchParams.get('player')
  const openEditing = searchParams.get('edit') === '1'

  const [me, setMe] = useState<{ id: string } | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [results, setResults] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState<'all' | 'noir' | 'blanc'>('all')
  const [positionFilter, setPositionFilter] = useState<'all' | 'attaquant' | 'defenseur' | 'gardien'>('all')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: meData } = await supabase
        .from('players')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      setMe(meData)

      const { data: playersData } = await supabase
        .from('players')
        .select('id, auth_user_id, first_name, last_name, number, team, position')
        .order('first_name', { ascending: true })

      setPlayers(playersData || [])

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('player_id, training_id, status')
        .eq('status', 'present')
      setAttendance(attendanceData || [])

      const { data: resultsData } = await supabase
        .from('results')
        .select('training_id, score_noir, score_blanc')
      setResults(resultsData || [])

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
      const mine = player.team === 'noir' ? result.score_noir : result.score_blanc
      const other = player.team === 'noir' ? result.score_blanc : result.score_noir
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

  function openPlayer(id: string, edit?: boolean) {
    router.push(`/vestiaire?player=${id}${edit ? '&edit=1' : ''}`, { scroll: false })
  }

  function closeModal() {
    router.push('/vestiaire', { scroll: false })
  }

  if (loading) return <p style={{ padding: 40 }}>Chargement...</p>

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <h1 style={{ marginBottom: 24, color: CLUB_BLUE, fontSize: 26 }}>Vestiaire</h1>

        <div className="blm-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 24 }}>
          <input
            placeholder="Rechercher un joueur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 160, padding: 8, border: '1px solid #ccc', borderRadius: 20 }}
          />
          {(['all', 'noir', 'blanc'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTeamFilter(t)}
              className={teamFilter === t ? 'blm-pill-active' : 'blm-pill'}
            >
              {t === 'all' ? 'Toutes équipes' : t === 'noir' ? 'Noir' : 'Blanc'}
            </button>
          ))}
          {(['all', 'attaquant', 'defenseur', 'gardien'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPositionFilter(p)}
              className={positionFilter === p ? 'blm-pill-active' : 'blm-pill'}
            >
              {p === 'all' ? 'Tous postes' : p === 'attaquant' ? 'Attaquant' : p === 'defenseur' ? 'Défenseur' : 'Gardien'}
            </button>
          ))}
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
                      background: isNoir ? '#111' : '#fff', color: isNoir ? '#fff' : '#111',
                      border: isNoir ? 'none' : '1px solid #111', fontSize: 12, fontWeight: 600,
                      padding: '4px 12px', borderRadius: 20,
                    }}
                  >
                    {isNoir ? 'Noir' : 'Blanc'}
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
    <Suspense fallback={<div><p style={{ padding: 40 }}>Chargement...</p></div>}>
      <VestiaireContent />
    </Suspense>
  )
}
