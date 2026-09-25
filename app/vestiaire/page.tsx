'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/app/components/NavBar'

type Player = {
  id: string
  auth_user_id: string
  first_name: string
  last_name: string
  number: number | null
  team: string
  position: string
}

const CLUB_BLUE = '#003F6E'

export default function VestiairePage() {
  const supabase = createClient()
  const [me, setMe] = useState<{ id: string } | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
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
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

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

  if (loading) return <p style={{ padding: 40 }}>Chargement...</p>

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <h1 style={{ marginBottom: 24 }}>Vestiaire</h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 24, border: '1px solid #ddd', borderRadius: 16, padding: 12 }}>
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
              style={{
                padding: '6px 14px', borderRadius: 20, border: `1px solid ${CLUB_BLUE}`, cursor: 'pointer',
                background: teamFilter === t ? CLUB_BLUE : '#fff',
                color: teamFilter === t ? '#fff' : CLUB_BLUE,
              }}
            >
              {t === 'all' ? 'Toutes équipes' : t === 'noir' ? 'Noir' : 'Blanc'}
            </button>
          ))}
          {(['all', 'attaquant', 'defenseur', 'gardien'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPositionFilter(p)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: `1px solid ${CLUB_BLUE}`, cursor: 'pointer',
                background: positionFilter === p ? CLUB_BLUE : '#fff',
                color: positionFilter === p ? '#fff' : CLUB_BLUE,
              }}
            >
              {p === 'all' ? 'Tous postes' : p === 'attaquant' ? 'Attaquant' : p === 'defenseur' ? 'Défenseur' : 'Gardien'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {filtered.map((player) => {
            const isMe = player.id === me?.id
            const initials = `${player.first_name[0] || ''}${player.last_name[0] || ''}`.toUpperCase()
            const isNoir = player.team === 'noir'

            return (
              <Link
                key={player.id}
                href={`/vestiaire/${player.id}`}
                style={{
                  textDecoration: 'none', color: '#111', display: 'block',
                  border: '1px solid #eee', borderTop: `4px solid ${CLUB_BLUE}`, borderRadius: 20,
                  padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', background: '#fff', position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 48, height: 48, borderRadius: '50%', background: CLUB_BLUE, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: 12,
                  }}
                >
                  {initials}
                </div>
                <span
                  style={{
                    position: 'absolute', top: 16, right: 16, width: 14, height: 14, borderRadius: '50%',
                    background: isNoir ? '#111' : '#fff',
                    border: '1px solid #111',
                  }}
                  title={isNoir ? 'Équipe Noir' : 'Équipe Blanc'}
                />
                <div style={{ fontWeight: 'bold' }}>
                  {player.first_name} {player.last_name} {isMe && <span style={{ color: CLUB_BLUE }}>(Moi)</span>}
                </div>
                <div style={{ fontSize: 13, color: '#666' }}>
                  #{player.number ?? '-'} · {player.position === 'attaquant' ? 'Attaquant' : player.position === 'defenseur' ? 'Défenseur' : 'Gardien'}
                </div>
              </Link>
            )
          })}
        </div>

        {filtered.length === 0 && <p style={{ marginTop: 24, color: '#666' }}>Aucun joueur ne correspond à ces critères.</p>}
      </div>
    </div>
  )
}
