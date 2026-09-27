'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/app/components/NavBar'
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

type AttendanceRow = {
  id: string
  training_id: string
  player_id: string
  status: string
  team: string | null
  players: { first_name: string; last_name: string; team: string; position: string | null } | null
}

function statusPill(status: string | undefined) {
  if (status === 'present') return { text: 'Présent', bg: '#DFF3E7', color: '#2E7D5B' }
  if (status === 'forfait') return { text: 'Forfait', bg: '#FBE4E1', color: '#B23A2E' }
  return { text: 'En attente', bg: '#EFEFEF', color: '#666' }
}

function dayCountdown(dateStr: string) {
  const now = new Date()
  const target = new Date(dateStr)
  const diffMs = target.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)
  const days = Math.round(diffMs / 86400000)
  if (days <= 0) return 'J-0 (aujourd\'hui)'
  if (days === 1) return 'J-1 (demain)'
  return `J-${days}`
}

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function effectiveTeam(r: AttendanceRow) {
  return r.team ?? r.players?.team ?? 'noir'
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

function nextPosition(pos: string) {
  if (pos === 'attaquant') return 'defenseur'
  if (pos === 'defenseur') return 'attaquant'
  return pos
}

export default function CalendarPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Player | null>(null)
  const [trainings, setTrainings] = useState<Training[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
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
    if (!user) return

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
      return trainingsData && trainingsData.length > 0 ? [trainingsData[0].id] : []
    })

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('id, training_id, player_id, status, team, players(first_name, last_name, team, position)')

    setAttendance((attendanceData as unknown as AttendanceRow[]) || [])
    setPositionOverrides({})
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
  }, [])

  function effectivePosition(r: AttendanceRow) {
    return positionOverrides[r.id] ?? r.players?.position ?? 'attaquant'
  }

  function handleChangePosition(r: AttendanceRow) {
    const current = effectivePosition(r)
    if (current === 'gardien') return
    setPositionOverrides((prev) => ({ ...prev, [r.id]: nextPosition(current) }))
  }

  async function handleTransferTeam(r: AttendanceRow, targetTeam: string) {
    await supabase.from('attendance').update({ team: targetTeam }).eq('id', r.id)
    loadAll()
  }

  async function setMyStatus(trainingId: string, status: string) {
    if (!me) return
    await supabase.from('attendance').upsert(
      { training_id: trainingId, player_id: me.id, status, team: me.team },
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

  if (loading) return <p style={{ padding: 40 }}>Chargement...</p>

  const isAdmin = effectiveIsAdmin(me?.role)
  const nextTraining = trainings[0]

  return (
    <div>
      <NavBar />

      <div style={{ background: '#EAF0F6', padding: '28px 16px 36px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {nextTraining ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 6 }}>
                {new Date(nextTraining.date_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div style={{ color: '#555', marginBottom: 16, fontSize: 15 }}>
                {new Date(nextTraining.date_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {nextTraining.location}
              </div>
              <span style={{ background: CLUB_GOLD, color: '#1A1A1A', fontWeight: 'bold', padding: '7px 16px', borderRadius: 10, display: 'inline-block', fontSize: 14 }}>
                {dayCountdown(nextTraining.date_time)}
              </span>
            </>
          ) : (
            <div style={{ fontSize: 18, color: '#555' }}>Aucun entraînement à venir</div>
          )}
        </div>

        <svg
          className="blm-hero-rink"
          width="160" height="160" viewBox="0 0 160 160"
          style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}
        >
          <circle cx="80" cy="80" r="70" fill="none" stroke={CLUB_BLUE} strokeWidth="2" />
          <circle cx="112" cy="80" r="6" fill={CLUB_GOLD} />
          <line x1="80" y1="10" x2="80" y2="150" stroke={CLUB_BLUE} strokeWidth="2" />
        </svg>
      </div>

      <div style={{ maxWidth: 720, margin: '32px auto 40px', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <h1 style={{ marginBottom: 8, color: CLUB_BLUE, fontSize: 26 }}>Calendrier</h1>
        <p style={{ color: '#666', marginBottom: 24 }}>
          Indiquez votre présence — les compos s&apos;ajustent en fonction des réponses.
        </p>

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
          const blancs = presents.filter((r) => effectiveTeam(r) === 'blanc')
          const noirs = presents.filter((r) => effectiveTeam(r) === 'noir')
          const countPos = (arr: AttendanceRow[], pos: string) => arr.filter((r) => effectivePosition(r) === pos).length
          const totalA = presents.filter((r) => effectivePosition(r) === 'attaquant').length
          const totalD = presents.filter((r) => effectivePosition(r) === 'defenseur').length
          const isExpanded = (expandedTrainings || []).includes(training.id)
          const pill = statusPill(myRow?.status)

          return (
            <div key={training.id} className="blm-card" style={{ marginBottom: 16 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                onClick={() => toggleTraining(training.id)}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                    {new Date(training.date_time).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ color: '#666', marginTop: 2 }}>{training.location}</div>
                </div>
                <button
                  style={{ background: '#F0F0F0', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14 }}
                >
                  {isExpanded ? '▲' : '▼'}
                </button>
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
                    { key: 'blanc', label: 'Blancs', rows: blancs, other: 'noir', otherLabel: 'Noir', dot: <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', border: '2px solid #1A1A1A', display: 'inline-block' }} /> },
                    { key: 'noir', label: 'Noirs', rows: noirs, other: 'blanc', otherLabel: 'Blanc', dot: <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#1A1A1A', display: 'inline-block' }} /> },
                    { key: 'forfaits', label: 'Forfaits', rows: forfaits, other: null, otherLabel: null, dot: <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#B23A2E', display: 'inline-block' }} /> },
                  ].map((block) => {
                    const blockKey = `${training.id}:${block.key}`
                    const blockExpanded = !!expandedBlocks[blockKey]
                    const countLabel = block.key === 'forfaits'
                      ? `${block.rows.length} forfait${block.rows.length > 1 ? 's' : ''}`
                      : `${block.rows.length} (${countPos(block.rows, 'attaquant')}A / ${countPos(block.rows, 'defenseur')}D)`
                    const blockA = countPos(block.rows, 'attaquant')
                    const blockD = countPos(block.rows, 'defenseur')
                    const blockG = countPos(block.rows, 'gardien')

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
                            ) : (
                              <>
                                <div style={{ fontSize: 12.5, color: '#666', marginBottom: 10 }}>
                                  Effectif {block.label}{' '}
                                  {blockA > 0 && <><strong>{blockA} Attaquant{blockA > 1 ? 's' : ''}</strong>{(blockD > 0 || blockG > 0) ? ' • ' : ''}</>}
                                  {blockD > 0 && <><strong>{blockD} Défenseur{blockD > 1 ? 's' : ''}</strong>{blockG > 0 ? ' • ' : ''}</>}
                                  {blockG > 0 && <strong>{blockG} Gardien{blockG > 1 ? 's' : ''}</strong>}
                                </div>
                                {block.rows.map((r) => {
                                  const pos = effectivePosition(r)
                                  const style = positionStyle(pos)
                                  return (
                                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #eee' }}>
                                      <button
                                        onClick={() => handleChangePosition(r)}
                                        title={pos !== 'gardien' ? 'Changer le poste (ce match uniquement)' : undefined}
                                        style={{
                                          width: 26, height: 26, borderRadius: '50%', border: 'none', flexShrink: 0,
                                          background: style.bg, color: style.color, fontWeight: 800, fontSize: 12,
                                          cursor: pos !== 'gardien' ? 'pointer' : 'default',
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
                    <strong>{presents.length}</strong> joueurs présents ({totalA}A / {totalD}D)
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
