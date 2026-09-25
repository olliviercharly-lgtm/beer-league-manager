'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/app/components/NavBar'

type Player = {
  id: string
  league_id: string
  first_name: string
  last_name: string
  team: string
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
  players: { first_name: string; last_name: string; team: string } | null
}

type LeagueSettings = {
  doodle_ics_url: string | null
  doodle_title_filter: string | null
}

export default function CalendarPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Player | null>(null)
  const [trainings, setTrainings] = useState<Training[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [newDate, setNewDate] = useState('')
  const [newLocation, setNewLocation] = useState('')

  const [league, setLeague] = useState<LeagueSettings | null>(null)
  const [doodleUrl, setDoodleUrl] = useState('')
  const [doodleFilter, setDoodleFilter] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: meData } = await supabase
      .from('players')
      .select('id, league_id, first_name, last_name, team, role')
      .eq('auth_user_id', user.id)
      .single()

    setMe(meData)

    if (meData) {
      const { data: leagueData } = await supabase
        .from('leagues')
        .select('doodle_ics_url, doodle_title_filter')
        .eq('id', meData.league_id)
        .single()

      if (leagueData) {
        setLeague(leagueData)
        setDoodleUrl(leagueData.doodle_ics_url || '')
        setDoodleFilter(leagueData.doodle_title_filter || '')
      }
    }

    const { data: trainingsData } = await supabase
      .from('trainings')
      .select('id, date_time, location')
      .order('date_time', { ascending: true })

    setTrainings(trainingsData || [])

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('id, training_id, player_id, status, players(first_name, last_name, team)')

    setAttendance((attendanceData as unknown as AttendanceRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function setMyStatus(trainingId: string, status: string) {
    if (!me) return
    await supabase.from('attendance').upsert(
      { training_id: trainingId, player_id: me.id, status },
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

  async function saveDoodleSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    await fetch('/api/league-doodle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doodleIcsUrl: doodleUrl, doodleTitleFilter: doodleFilter }),
    })
    setSavingSettings(false)
    loadAll()
  }

  async function syncDoodle() {
    setSyncing(true)
    setSyncMessage('')
    const res = await fetch('/api/sync-doodle', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setSyncMessage(`Synchronisé : ${data.created} créé(s), ${data.updated} mis à jour.`)
    } else {
      setSyncMessage(`Erreur : ${data.error}`)
    }
    setSyncing(false)
    loadAll()
  }

  if (loading) return <p style={{ padding: 40 }}>Chargement...</p>

  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin'

  return (
    <>
      <NavBar />
      <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 24 }}>Calendrier des entraînements</h1>

      {isAdmin && (
        <>
          <details style={{ marginBottom: 24, border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Synchronisation Doodle</summary>

            <form onSubmit={saveDoodleSettings} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <label style={{ fontSize: 13, color: '#555' }}>
                URL iCal du Doodle (dans Doodle : menu &quot;…&quot; → &quot;Exporter&quot; → copier le lien iCal)
              </label>
              <input
                placeholder="https://doodle.com/.../ical"
                value={doodleUrl}
                onChange={(e) => setDoodleUrl(e.target.value)}
                style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
              />
              <label style={{ fontSize: 13, color: '#555' }}>
                Filtre sur le titre (optionnel, ex : &quot;Entraînement&quot;)
              </label>
              <input
                placeholder="Entraînement"
                value={doodleFilter}
                onChange={(e) => setDoodleFilter(e.target.value)}
                style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
              />
              <button
                type="submit"
                disabled={savingSettings}
                style={{ padding: '8px 16px', borderRadius: 6, background: '#333', color: '#fff', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}
              >
                {savingSettings ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </form>

            {league?.doodle_ics_url && (
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={syncDoodle}
                  disabled={syncing}
                  style={{ padding: '8px 16px', borderRadius: 6, background: '#2E7D5B', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  {syncing ? 'Synchronisation...' : 'Synchroniser avec Doodle'}
                </button>
                {syncMessage && <p style={{ marginTop: 8, fontSize: 13, color: '#555' }}>{syncMessage}</p>}
              </div>
            )}
          </details>

          <form onSubmit={createTraining} style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
            />
            <input
              placeholder="Lieu"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              required
              style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6, flex: 1 }}
            />
            <button type="submit" style={{ padding: '8px 16px', borderRadius: 6, background: '#2E7D5B', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Ajouter
            </button>
          </form>
        </>
      )}

      {trainings.length === 0 && <p>Aucun entraînement programmé pour le moment.</p>}

      {trainings.map((training) => {
        const rows = attendance.filter((a) => a.training_id === training.id)
        const presents = rows.filter((r) => r.status === 'present')
        const forfaits = rows.filter((r) => r.status === 'forfait')
        const myRow = rows.find((r) => r.player_id === me?.id)

        return (
          <div key={training.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
              {new Date(training.date_time).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ color: '#555', marginBottom: 12 }}>{training.location}</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => setMyStatus(training.id, 'present')}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: '1px solid #2E7D5B', cursor: 'pointer',
                  background: myRow?.status === 'present' ? '#2E7D5B' : '#fff',
                  color: myRow?.status === 'present' ? '#fff' : '#2E7D5B',
                }}
              >
                Présent
              </button>
              <button
                onClick={() => setMyStatus(training.id, 'forfait')}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: '1px solid #B23A2E', cursor: 'pointer',
                  background: myRow?.status === 'forfait' ? '#B23A2E' : '#fff',
                  color: myRow?.status === 'forfait' ? '#fff' : '#B23A2E',
                }}
              >
                Forfait
              </button>
            </div>

            <div style={{ fontSize: 14, color: '#333' }}>
              <strong>{presents.length}</strong> présent(s) · <strong>{forfaits.length}</strong> forfait(s)
            </div>
            {presents.length > 0 && (
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                {presents.map((r) => `${r.players?.first_name} ${r.players?.last_name}`).join(', ')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
