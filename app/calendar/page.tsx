'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLeagueTeams } from '@/lib/useLeagueTeams'
import { useGameNumbers } from '@/lib/useGameNumbers'
import NavBar from '@/app/components/NavBar'
import ShareButton from '@/app/components/ShareButton'
import { SkeletonList } from '@/app/components/SkeletonCard'
import { effectiveIsAdmin } from '@/lib/viewRole'

const CLUB_BLUE = '#003F6E'
const CLUB_GOLD = '#C9A227'

type Player = {
  id: string
  league_id: string
  first_name: string
  last_name: string
  team: string
  position: string | null
  role: string
}

type Training = {
  id: string
  date_time: string
  location: string
}

type LeaguePlayer = {
  id: string
  first_name: string
  last_name: string
}

type AttendanceRow = {
  id: string
  training_id: string
  player_id: string
  status: string
  team: string | null
  players: { first_name: string; last_name: string; team: string; position: string | null; is_hybrid: boolean | null } | null
}

function statusPill(status: string | undefined) {
  if (status === 'present') return { text: 'Présent', bg: '#DFF3E7', color: '#2E7D5B' }
  if (status === 'forfait') return { text: 'Forfait', bg: '#FBE4E1', color: '#B23A2E' }
  return { text: 'En attente', bg: '#EFEFEF', color: '#666' }
}

function countdownParts(dateStr: string) {
  const now = new Date()
  const target = new Date(dateStr)
  const diffMs = target.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)
  const days = Math.round(diffMs / 86400000)
  if (days <= 0) return { big: 'J-0', small: "aujourd'hui" }
  if (days === 1) return { big: 'J-1', small: 'demain' }
  return { big: `J-${days}`, small: 'jours' }
}

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function effectiveTeam(r: AttendanceRow) {
  return r.team ?? r.players?.team ?? 'noir'
}

function positionRank(pos: string | undefined | null) {
  if (pos === 'gardien') return 0
  if (pos === 'defenseur') return 1
  return 2
}

function positionLetter(pos: string | undefined | null) {
  if (pos === 'attaquant') return 'A'
  if (pos === 'defenseur') return 'D'
  if (pos === 'gardien') return 'G'
  return '?'
}

function positionStyle(pos: string | undefined | null) {
  if (pos === 'attaquant') return { bg: '#FBF3DD', color: CLUB_GOLD }
  if (pos === 'defenseur') return { bg: '#EAF1F7', color: CLUB_BLUE }
  return { bg: '#EDEFF3', color: '#6B7688' }
}

function nextPosition(pos: string, isHybrid: boolean) {
  if (isHybrid) {
    if (pos === 'attaquant') return 'defenseur'
    if (pos === 'defenseur') return 'gardien'
    if (pos === 'gardien') return 'attaquant'
    return pos
  }
  if (pos === 'attaquant') return 'defenseur'
  if (pos === 'defenseur') return 'attaquant'
  return pos
}

function CalendarPageInner() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const focusTrainingId = searchParams.get('training')
  const teams = useLeagueTeams()
  const gameNumbers = useGameNumbers()
  const [me, setMe] = useState<Player | null>(null)
  const [trainings, setTrainings] = useState<Training[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [leaguePlayers, setLeaguePlayers] = useState<LeaguePlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [newDate, setNewDate] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [expandedTrainings, setExpandedTrainings] = useState<string[] | null>(null)
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({})
  const [editingTrainingId, setEditingTrainingId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [positionOverrides, setPositionOverrides] = useState<Record<string, string>>({})

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const next = `/calendar${focusTrainingId ? `?training=${focusTrainingId}` : ''}`
      router.push(`/login?next=${encodeURIComponent(next)}`)
      return
    }

    const { data: meData } = await supabase
      .from('players')
      .select('id, league_id, first_name, last_name, team, position, role')
      .eq('auth_user_id', user.id)
      .single()

    setMe(meData)

    const { data: trainingsData } = await supabase
      .from('trainings')
      .select('id, date_time, location')
      .gte('date_time', new Date().toISOString())
      .order('date_time', { ascending: true })

    setTrainings(trainingsData || [])

    setExpandedTrainings((prev) => {
      if (prev !== null) return prev
      if (focusTrainingId) return [focusTrainingId]
      return trainingsData && trainingsData.length > 0 ? [trainingsData[0].id] : []
    })

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('id, training_id, player_id, status, team, players(first_name, last_name, team, position, is_hybrid)')

    setAttendance((attendanceData as unknown as AttendanceRow[]) || [])
    setPositionOverrides({})

    if (meData?.league_id) {
      const { data: leaguePlayersData } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .eq('league_id', meData.league_id)
      setLeaguePlayers(leaguePlayersData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
  }, [])

  useEffect(() => {
    if (loading || !focusTrainingId) return
    const el = document.getElementById(`training-${focusTrainingId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [loading, focusTrainingId])

  function pendingNames(trainingId: string) {
    const respondedIds = new Set(attendance.filter((a) => a.training_id === trainingId).map((a) => a.player_id))
    return leaguePlayers.filter((p) => !respondedIds.has(p.id)).map((p) => p.first_name)
  }

  function pendingLabel(names: string[]) {
    if (names.length === 0) return ''
    if (names.length <= 4) return `${names.join(', ')} n'${names.length > 1 ? 'ont' : 'a'} pas encore répondu.`
    return `${names.slice(0, 4).join(', ')} et ${names.length - 4} autre${names.length - 4 > 1 ? 's' : ''} n'ont pas encore répondu.`
  }

  function effectivePosition(r: AttendanceRow) {
    return positionOverrides[r.id] ?? r.players?.position ?? 'attaquant'
  }

  function handleChangePosition(r: AttendanceRow) {
    const isHybrid = !!r.players?.is_hybrid
    const current = effectivePosition(r)
    if (current === 'gardien' && !isHybrid) return
    setPositionOverrides((prev) => ({ ...prev, [r.id]: nextPosition(current, isHybrid) }))
  }

  async function handleTransferTeam(r: AttendanceRow, targetTeam: string) {
    await supabase.from('attendance').update({ team: targetTeam }).eq('id', r.id)
    loadAll()
  }

  async function handleSetGoalieTeam(r: AttendanceRow, team: 'blanc' | 'noir') {
    const next = r.team === team ? null : team
    await supabase.from('attendance').update({ team: next }).eq('id', r.id)
    loadAll()
  }

  async function setMyStatus(trainingId: string, status: string) {
    if (!me) return
    await supabase.from('attendance').upsert(
      { training_id: trainingId, player_id: me.id, status, team: me.position === 'gardien' ? null : me.team },
      { onConflict: 'training_id,player_id' }
    )
    loadAll()
  }

  async function createTraining(e: React.FormEvent) {
    e.preventDefault()
    if (!me) return
    await supabase.from('trainings').insert({
      league_id: me.league_id,
      date_time: new Date(newDate).toISOString(),
      location: newLocation,
    })
    setNewDate('')
    setNewLocation('')
    loadAll()
  }

  function toggleTraining(id: string) {
    setExpandedTrainings((prev) => {
      const list = prev || []
      return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
    })
  }

  function toggleBlock(key: string) {
    setExpandedBlocks((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleStartEditTraining(training: Training) {
    setEditingTrainingId(training.id)
    setEditDate(toDatetimeLocalValue(training.date_time))
    setEditLocation(training.location)
  }

  function handleCancelEditTraining() {
    setEditingTrainingId(null)
    setEditDate('')
    setEditLocation('')
  }

  async function handleSaveEditTraining(id: string) {
    await supabase
      .from('trainings')
      .update({
        date_time: new Date(editDate).toISOString(),
        location: editLocation,
      })
      .eq('id', id)
    setEditingTrainingId(null)
    loadAll()
  }

  async function handleDeleteTraining(id: string) {
    if (!confirm('Supprimer cet entraînement ? Les présences et résultats associés seront également supprimés. Cette action est irréversible.')) return
    await supabase.from('attendance').delete().eq('training_id', id)
    const { data: resultRows } = await supabase.from('results').select('id').eq('training_id', id)
    const resultIds = (resultRows || []).map((r: { id: string }) => r.id)
    if (resultIds.length > 0) {
      await supabase.from('result_challenges').delete().in('result_id', resultIds)
      await supabase.from('highlights').delete().in('result_id', resultIds)
      await supabase.from('results').delete().in('id', resultIds)
    }
    await supabase.from('trainings').delete().eq('id', id)
    setEditingTrainingId(null)
    loadAll()
  }

  if (loading) {
    return (
      <div>
        <NavBar />
        <div style={{ maxWidth: 720, margin: '32px auto 40px', fontFamily: 'sans-serif', padding: '0 16px' }}>
          <SkeletonList count={3} lines={3} />
        </div>
      </div>
    )
  }

  const isAdmin = effectiveIsAdmin(me?.role)
  const nextTraining = trainings[0]
  const nextPendingNames = nextTraining ? pendingNames(nextTraining.id) : []
  const nextPendingCount = nextPendingNames.length

  return (
    <div>
      <NavBar />

      <div style={{ background: `linear-gradient(135deg, ${CLUB_BLUE} 0%, #001F37 100%)`, padding: '32px 20px', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap',
          }}
        >
          {nextTraining ? (
            <>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11.5, fontWeight: 700, letterSpacing: 1.2, marginBottom: 8, textTransform: 'uppercase' }}>
                  Prochain entraînement{gameNumbers[nextTraining.id] ? ` · Match #${gameNumbers[nextTraining.id]}` : ''}
                </div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 6, textTransform: 'capitalize' }}>
                  {new Date(nextTraining.date_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14.5 }}>
                  🕒 {new Date(nextTraining.date_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  <span style={{ opacity: 0.5, margin: '0 8px' }}>·</span>
                  📍 {nextTraining.location}
                </div>
              </div>

              <div
                style={{
                  width: 84, height: 84, borderRadius: '50%', background: CLUB_GOLD,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.3)', flexShrink: 0,
                }}
              >
                <div style={{ fontSize: 21, fontWeight: 900, color: '#1A1A1A', lineHeight: 1 }}>
                  {countdownParts(nextTraining.date_time).big}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#1A1A1A', letterSpacing: 0.4, marginTop: 3, textTransform: 'uppercase' }}>
                  {countdownParts(nextTraining.date_time).small}
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)' }}>Aucun entraînement à venir</div>
          )}
        </div>

        {isAdmin && nextTraining && (
          <div style={{ maxWidth: 720, margin: '18px auto 0', position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <ShareButton
              variant="button"
              label={nextPendingCount > 0 ? `Relancer (${nextPendingCount} en attente)` : 'Relancer les joueurs'}
              title={`Entraînement ${new Date(nextTraining.date_time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
              path={`/calendar?training=${nextTraining.id}`}
              excerpt={`⏰ Entraînement ${new Date(nextTraining.date_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${new Date(nextTraining.date_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} (${nextTraining.location}).${nextPendingCount > 0 ? ` ${pendingLabel(nextPendingNames)}` : ''} Clique pour te déclarer présent ou forfait en 1 clic 👇`}
            />
          </div>
        )}

        <svg
          className="blm-hero-rink"
          width="220" height="220" viewBox="0 0 160 160"
          style={{ position: 'absolute', right: -30, top: '50%', transform: 'translateY(-50%)', opacity: 0.12 }}
        >
          <circle cx="80" cy="80" r="70" fill="none" stroke="#fff" strokeWidth="2" />
          <circle cx="112" cy="80" r="6" fill="#fff" />
          <line x1="80" y1="10" x2="80" y2="150" stroke="#fff" strokeWidth="2" />
        </svg>
      </div>

      <div style={{ maxWidth: 720, margin: '32px auto 40px', fontFamily: 'sans-serif', padding: '0 16px' }}>
        {isAdmin && (
          <form
            onSubmit={createTraining}
            className="blm-card"
            style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}
          >
            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              style={{ padding: 8, border: '1px solid #ddd', borderRadius: 10 }}
            />
            <input
              placeholder="Lieu"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              required
              style={{ padding: 8, border: '1px solid #ddd', borderRadius: 10, flex: 1 }}
            />
            <button type="submit" className="blm-btn-primary">
              Ajouter
            </button>
          </form>
        )}

        {trainings.length === 0 && <p>Aucun entraînement programmé pour le moment.</p>}

        {trainings.map((training) => {
          const rows = attendance.filter((a) => a.training_id === training.id)
          const presents = rows.filter((r) => r.status === 'present')
          const forfaits = rows.filter((r) => r.status === 'forfait')
          const myRow = rows.find((r) => r.player_id === me?.id)
          const gardiens = presents.filter((r) => effectivePosition(r) === 'gardien')
          const blancs = presents.filter((r) => effectiveTeam(r) === 'blanc' && effectivePosition(r) !== 'gardien')
          const noirs = presents.filter((r) => effectiveTeam(r) === 'noir' && effectivePosition(r) !== 'gardien')
          const countPos = (arr: AttendanceRow[], pos: string) => arr.filter((r) => effectivePosition(r) === pos).length
          const totalA = presents.filter((r) => effectivePosition(r) === 'attaquant').length
          const totalD = presents.filter((r) => effectivePosition(r) === 'defenseur').length
          const totalG = presents.filter((r) => effectivePosition(r) === 'gardien').length
          const isExpanded = (expandedTrainings || []).includes(training.id)
          const pill = statusPill(myRow?.status)
          const trainingPendingNames = pendingNames(training.id)
          const pendingCount = trainingPendingNames.length

          return (
            <div
              key={training.id}
              id={`training-${training.id}`}
              className="blm-card"
              style={{ marginBottom: 16, scrollMarginTop: 16, ...(focusTrainingId === training.id ? { border: `2px solid ${CLUB_GOLD}` } : {}) }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                onClick={() => toggleTraining(training.id)}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                    {new Date(training.date_time).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ color: '#666', marginTop: 2 }}>
                    {training.location}
                    {gameNumbers[training.id] && (
                      <span style={{ marginLeft: 8, color: CLUB_BLUE, fontWeight: 700, fontSize: 12 }}>
                        · Match #{gameNumbers[training.id]}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  {isAdmin && (
                    <ShareButton
                      title={`Entraînement ${new Date(training.date_time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
                      path={`/calendar?training=${training.id}`}
                      excerpt={`⏰ Entraînement ${new Date(training.date_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${new Date(training.date_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} (${training.location}).${pendingCount > 0 ? ` ${pendingLabel(trainingPendingNames)}` : ''} Clique pour te déclarer présent ou forfait en 1 clic 👇`}
                    />
                  )}
                  <button
                    onClick={() => toggleTraining(training.id)}
                    style={{ background: '#F0F0F0', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14 }}
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {isAdmin && editingTrainingId !== training.id && (
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartEditTraining(training) }}
                    style={{ background: 'none', border: 'none', color: CLUB_BLUE, cursor: 'pointer', fontSize: 12, padding: 0 }}
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTraining(training.id) }}
                    style={{ background: 'none', border: 'none', color: '#B23A2E', cursor: 'pointer', fontSize: 12, padding: 0 }}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              )}

              {editingTrainingId === training.id && (
                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  <input
                    type="datetime-local"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
                  />
                  <input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleCancelEditTraining}
                      style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleSaveEditTraining(training.id)}
                      className="blm-btn-primary"
                      style={{ padding: '6px 14px' }}
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}

              {!isExpanded && (
                <div style={{ marginTop: 12, fontSize: 14, color: '#333', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: pill.bg, color: pill.color, padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    {pill.text}
                  </span>
                  <span><strong>{presents.length}</strong> présent(s)</span>
                </div>
              )}

              {isExpanded && (
                <>
                  <div className="blm-subcard" style={{ background: '#F5F7FA', margin: '14px 0' }}>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Votre statut pour ce match :</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <strong>{me?.first_name} {me?.last_name}</strong>
                      <span style={{ background: pill.bg, color: pill.color, padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                        {pill.text}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => setMyStatus(training.id, 'present')}
                        style={{
                          flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #2E7D5B', cursor: 'pointer', fontWeight: 600,
                          background: myRow?.status === 'present' ? '#2E7D5B' : '#fff',
                          color: myRow?.status === 'present' ? '#fff' : '#2E7D5B',
                        }}
                      >
                        ✓ Présent
                      </button>
                      <button
                        onClick={() => setMyStatus(training.id, 'forfait')}
                        style={{
                          flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #B23A2E', cursor: 'pointer', fontWeight: 600,
                          background: myRow?.status === 'forfait' ? '#B23A2E' : '#fff',
                          color: myRow?.status === 'forfait' ? '#fff' : '#B23A2E',
                        }}
                      >
                        ✕ Forfait
                      </button>
                    </div>
                  </div>

                  {[
                    { key: 'blanc', label: teams.blancName, rows: blancs, other: 'noir', otherLabel: teams.noirName, dot: <span style={{ width: 14, height: 14, borderRadius: '50%', background: teams.blancColor, border: '2px solid rgba(0,0,0,0.25)', display: 'inline-block' }} /> },
                    { key: 'noir', label: teams.noirName, rows: noirs, other: 'blanc', otherLabel: teams.blancName, dot: <span style={{ width: 14, height: 14, borderRadius: '50%', background: teams.noirColor, display: 'inline-block' }} /> },
                    { key: 'gardiens', label: 'Gardiens', rows: gardiens, other: null, otherLabel: null, dot: <span style={{ width: 14, height: 14, borderRadius: '50%', background: CLUB_GOLD, display: 'inline-block' }} /> },
                    { key: 'forfaits', label: 'Forfaits', rows: forfaits, other: null, otherLabel: null, dot: <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#B23A2E', display: 'inline-block' }} /> },
                  ].map((block) => {
                    const blockKey = `${training.id}:${block.key}`
                    const blockExpanded = !!expandedBlocks[blockKey]
                    const blockA = countPos(block.rows, 'attaquant')
                    const blockD = countPos(block.rows, 'defenseur')
                    const countLabel = block.key === 'forfaits'
                      ? `${block.rows.length} forfait${block.rows.length > 1 ? 's' : ''}`
                      : block.key === 'gardiens'
                      ? `${block.rows.length} gardien${block.rows.length > 1 ? 's' : ''}`
                      : `${block.rows.length} (${blockA}A / ${blockD}D)`

                    return (
                      <div key={block.key} className="blm-subcard" style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleBlock(blockKey)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {block.dot}
                            <div>
                              <div style={{ fontWeight: 'bold' }}>{block.label}</div>
                              <div style={{ fontSize: 12, color: '#888' }}>{blockExpanded ? 'Cliquer pour replier' : 'Cliquer pour déplier'}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ background: '#EEE', borderRadius: 20, padding: '4px 10px', fontSize: 13, fontWeight: 600 }}>{countLabel}</span>
                            <span>{blockExpanded ? '▲' : '▼'}</span>
                          </div>
                        </div>
                        {blockExpanded && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #eee' }}>
                            {block.rows.length === 0 ? (
                              <div style={{ fontSize: 13, color: '#999' }}>Aucun joueur</div>
                            ) : block.key === 'forfaits' ? (
                              block.rows.map((r) => (
                                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                                  <span>{r.players?.first_name} {r.players?.last_name}</span>
                                </div>
                              ))
                            ) : block.key === 'gardiens' ? (
                              <>
                                {block.rows.map((r) => {
                                  const isHybrid = !!r.players?.is_hybrid
                                  return (
                                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #eee' }}>
                                      <button
                                        onClick={() => handleChangePosition(r)}
                                        title={isHybrid ? 'Changer le poste (ce match uniquement)' : undefined}
                                        style={{
                                          width: 26, height: 26, borderRadius: '50%', border: 'none', flexShrink: 0,
                                          background: positionStyle('gardien').bg, color: positionStyle('gardien').color, fontWeight: 800, fontSize: 12,
                                          cursor: isHybrid ? 'pointer' : 'default',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                      >
                                        G
                                      </button>
                                      <span style={{ flex: 1, fontWeight: 600, fontSize: 14.5, minWidth: 0 }}>
                                        {r.players?.first_name} {r.players?.last_name}
                                      </span>
                                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        <button
                                          onClick={() => handleSetGoalieTeam(r, 'blanc')}
                                          style={{
                                            padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                                            border: '1px solid rgba(0,0,0,0.25)',
                                            background: r.team === 'blanc' ? teams.blancColor : '#fff',
                                            color: r.team === 'blanc' ? '#1A1A1A' : '#999',
                                          }}
                                        >
                                          {teams.blancName}
                                        </button>
                                        <button
                                          onClick={() => handleSetGoalieTeam(r, 'noir')}
                                          style={{
                                            padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                                            border: `1px solid ${teams.noirColor}`,
                                            background: r.team === 'noir' ? teams.noirColor : '#fff',
                                            color: r.team === 'noir' ? '#fff' : '#999',
                                          }}
                                        >
                                          {teams.noirName}
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </>
                            ) : (
                              <>
                                <div style={{ fontSize: 12.5, color: '#666', marginBottom: 10 }}>
                                  Effectif {block.label}{' '}
                                  {blockA > 0 && <><strong>{blockA} Attaquant{blockA > 1 ? 's' : ''}</strong>{blockD > 0 ? ' • ' : ''}</>}
                                  {blockD > 0 && <strong>{blockD} Défenseur{blockD > 1 ? 's' : ''}</strong>}
                                </div>
                                {[...block.rows]
                                  .sort((a, b) => positionRank(effectivePosition(a)) - positionRank(effectivePosition(b)))
                                  .map((r) => {
                                  const pos = effectivePosition(r)
                                  const style = positionStyle(pos)
                                  const isHybrid = !!r.players?.is_hybrid
                                  const canChangePosition = isHybrid || pos !== 'gardien'
                                  return (
                                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #eee' }}>
                                      <button
                                        onClick={() => handleChangePosition(r)}
                                        title={canChangePosition ? 'Changer le poste (ce match uniquement)' : undefined}
                                        style={{
                                          width: 26, height: 26, borderRadius: '50%', border: 'none', flexShrink: 0,
                                          background: style.bg, color: style.color, fontWeight: 800, fontSize: 12,
                                          cursor: canChangePosition ? 'pointer' : 'default',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                      >
                                        {positionLetter(pos)}
                                      </button>
                                      <span style={{ flex: 1, fontWeight: 600, fontSize: 14.5 }}>
                                        {r.players?.first_name} {r.players?.last_name}
                                      </span>
                                      <button
                                        onClick={() => handleTransferTeam(r, block.other as string)}
                                        style={{
                                          background: CLUB_BLUE, color: '#fff', border: 'none', borderRadius: 20,
                                          padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                                        }}
                                      >
                                        ⇄ → {block.otherLabel}
                                      </button>
                                    </div>
                                  )
                                })}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  <div style={{ marginTop: 14, fontSize: 14, textAlign: 'center' }}>
                    <strong>{presents.length}</strong> joueurs présents ({totalA}A / {totalD}D{totalG > 0 ? ` / ${totalG}G` : ''})
                    {forfaits.length > 0 && (
                      <> · <span style={{ color: '#B23A2E' }}>{forfaits.length} forfait{forfaits.length > 1 ? 's' : ''}</span></>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <CalendarPageInner />
    </Suspense>
  )
}
