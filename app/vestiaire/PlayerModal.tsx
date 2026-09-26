'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const CLUB_BLUE = '#003F6E'
const CLUB_GOLD = '#C9A227'

type PlayerDetail = {
  id: string
  auth_user_id: string
  first_name: string
  last_name: string
  number: number | null
  team: string
  position: string
  style: string | null
  bio: string | null
  height_cm: number | null
  weight_kg: number | null
  shoots: string | null
  birth_date: string | null
  hometown: string | null
  joined_year: number | null
}
type Palmares = { id: string; player_id: string; trophy: string; year: number | null }
type Note = { id: string; player_id: string; text: string; year: number | null }
type AttendanceRow = { training_id: string }
type ResultRow = { training_id: string; score_noir: number; score_blanc: number }

function positionLabel(pos: string | null) {
  if (pos === 'attaquant') return 'Attaquant'
  if (pos === 'defenseur') return 'Défenseur'
  if (pos === 'gardien') return 'Gardien'
  return '—'
}

type Props = {
  playerId: string
  initialEditing?: boolean
  onClose: () => void
}

export default function PlayerModal({ playerId, initialEditing, onClose }: Props) {
  const supabase = createClient()
  const [myId, setMyId] = useState<string | null>(null)
  const [player, setPlayer] = useState<PlayerDetail | null>(null)
  const [palmares, setPalmares] = useState<Palmares[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [results, setResults] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(!!initialEditing)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<Partial<PlayerDetail>>({})
  const [newTrophy, setNewTrophy] = useState('')
  const [newTrophyYear, setNewTrophyYear] = useState('')
  const [newNoteText, setNewNoteText] = useState('')
  const [newNoteYear, setNewNoteYear] = useState('')

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: myData } = await supabase
        .from('players')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      setMyId(myData?.id ?? null)
    }

    const { data: playerData } = await supabase
      .from('players')
      .select('id, auth_user_id, first_name, last_name, number, team, position, style, bio, height_cm, weight_kg, shoots, birth_date, hometown, joined_year')
      .eq('id', playerId)
      .single()
    setPlayer(playerData)
    if (playerData) {
      setForm(playerData)
    }

    const { data: palmaresData } = await supabase
      .from('palmares')
      .select('id, player_id, trophy, year')
      .eq('player_id', playerId)
      .order('year', { ascending: false })
    setPalmares(palmaresData || [])

    const { data: notesData } = await supabase
      .from('player_notes')
      .select('id, player_id, text, year')
      .eq('player_id', playerId)
      .order('year', { ascending: false })
    setNotes(notesData || [])

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('training_id')
      .eq('player_id', playerId)
      .eq('status', 'present')
    setAttendance(attendanceData || [])

    const { data: resultsData } = await supabase
      .from('results')
      .select('training_id, score_noir, score_blanc')
    setResults(resultsData || [])

    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId])

  const stats = useMemo(() => {
    if (!player) return { matches: 0, victoires: 0, ratio: 0 }
    const resultsByTraining: Record<string, ResultRow> = {}
    results.forEach((r) => { resultsByTraining[r.training_id] = r })
    let matches = 0
    let victoires = 0
    attendance.forEach((a) => {
      const result = resultsByTraining[a.training_id]
      if (!result) return
      matches += 1
      const mine = player.team === 'noir' ? result.score_noir : result.score_blanc
      const other = player.team === 'noir' ? result.score_blanc : result.score_noir
      if (mine > other) victoires += 1
    })
    const ratio = matches > 0 ? Math.round((victoires / matches) * 100) : 0
    return { matches, victoires, ratio }
  }, [attendance, results, player])

  async function handleSave() {
    if (!player) return
    setSaving(true)
    await supabase
      .from('players')
      .update({
        number: form.number ? Number(form.number) : null,
        team: form.team,
        position: form.position,
        style: form.style || null,
        bio: form.bio || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        shoots: form.shoots || null,
        birth_date: form.birth_date || null,
        hometown: form.hometown || null,
        joined_year: form.joined_year ? Number(form.joined_year) : null,
      })
      .eq('id', player.id)
    setSaving(false)
    setIsEditing(false)
    loadAll()
  }

  async function handleAddTrophy() {
    if (!newTrophy.trim()) return
    await supabase.from('palmares').insert({
      player_id: playerId,
      trophy: newTrophy,
      year: newTrophyYear ? Number(newTrophyYear) : null,
    })
    setNewTrophy('')
    setNewTrophyYear('')
    loadAll()
  }

  async function handleDeleteTrophy(id: string) {
    await supabase.from('palmares').delete().eq('id', id)
    loadAll()
  }

  async function handleAddNote() {
    if (!newNoteText.trim()) return
    await supabase.from('player_notes').insert({
      player_id: playerId,
      text: newNoteText,
      year: newNoteYear ? Number(newNoteYear) : null,
    })
    setNewNoteText('')
    setNewNoteYear('')
    loadAll()
  }

  async function handleDeleteNote(id: string) {
    await supabase.from('player_notes').delete().eq('id', id)
    loadAll()
  }

  const isOwner = myId === playerId
  const initials = player ? `${player.first_name[0] || ''}${player.last_name[0] || ''}`.toUpperCase() : ''
  const isNoir = player?.team === 'noir'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, maxWidth: 480, width: '100%',
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)', position: 'relative',
        }}
      >
        <div style={{ padding: 24 }}>
          {loading || !player ? (
            <p>Chargement...</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 12 }}>
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
                  <div style={{ fontWeight: 'bold', fontSize: 20, lineHeight: 1.2, paddingTop: 4 }}>
                    {player.first_name} {player.last_name}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      background: isNoir ? '#111' : '#fff', color: isNoir ? '#fff' : '#111',
                      border: isNoir ? 'none' : '1px solid #111', fontSize: 12, fontWeight: 600,
                      padding: '4px 12px', borderRadius: 20,
                    }}
                  >
                    {isNoir ? 'Noir' : 'Blanc'}
                  </span>
                  <button
                    onClick={onClose}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', border: '1px solid #ddd', background: '#fff',
                      cursor: 'pointer', fontSize: 16, color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
                {positionLabel(player.position)}
                {isOwner && ' · Moi'}
                {player.joined_year && ` · Drafté en ${player.joined_year}`}
              </div>

              {!isEditing && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', padding: '14px 0', marginBottom: 16 }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 18 }}>{player.height_cm ? `${(player.height_cm / 100).toFixed(2)} m` : '—'}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>Taille</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 18 }}>{player.weight_kg ? `${player.weight_kg} kg` : '—'}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>Poids</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 18 }}>{player.shoots === 'gauche' ? 'Gauche' : player.shoots === 'droite' ? 'Droite' : '—'}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>Tir</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5, marginBottom: 6 }}>STYLE</div>
                  <div style={{ background: '#F5F5F5', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 14, color: player.style ? '#1A1A1A' : '#999' }}>
                    {player.style || 'Non renseigné'}
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5, marginBottom: 6 }}>PALMARÈS</div>
                  <div style={{ background: '#F5F5F5', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 14 }}>
                    {palmares.length === 0 ? (
                      <span style={{ color: '#999' }}>Aucun palmarès pour l&apos;instant.</span>
                    ) : (
                      palmares.map((p) => (
                        <div key={p.id} style={{ marginBottom: 4 }}>
                          🏆 {p.trophy}{p.year ? ` (${p.year})` : ''}
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5, marginBottom: 6 }}>ANECDOTES & MOMENTS MARQUANTS</div>
                  <div style={{ background: '#F5F5F5', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 14 }}>
                    {notes.length === 0 ? (
                      <span style={{ color: '#999' }}>Rien à signaler... pour l&apos;instant.</span>
                    ) : (
                      notes.map((n) => (
                        <div key={n.id} style={{ marginBottom: 4 }}>
                          {n.text}{n.year ? ` (${n.year})` : ''}
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5, marginBottom: 6 }}>À PROPOS</div>
                  <div style={{ background: '#F5F5F5', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 14, color: player.bio ? '#1A1A1A' : '#999' }}>
                    {player.bio || 'Biographie non renseignée.'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', padding: '14px 0' }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 18 }}>{stats.matches}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>Matches</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 18 }}>{stats.victoires}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>Victoires</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 18 }}>{stats.ratio}%</div>
                      <div style={{ fontSize: 12, color: '#888' }}>Ratio V/D</div>
                    </div>
                  </div>

                  {isOwner && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="blm-btn-primary"
                      style={{ width: '100%', marginTop: 16 }}
                    >
                      ✏️ Modifier ma fiche
                    </button>
                  )}
                </>
              )}

              {isEditing && isOwner && (
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5 }}>NUMÉRO</label>
                      <input
                        type="number"
                        value={form.number ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, number: e.target.value ? Number(e.target.value) : null }))}
                        style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 10, border: '1px solid #ddd', background: '#F5F5F5' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5 }}>ÉQUIPE</label>
                      <select
                        value={form.team ?? 'noir'}
                        onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}
                        style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 10, border: '1px solid #ddd', background: '#F5F5F5' }}
                      >
                        <option value="noir">Noir</option>
                        <option value="blanc">Blanc</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5 }}>POSTE</label>
                      <select
                        value={form.position ?? 'attaquant'}
                        onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                        style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 10, border: '1px solid #ddd', background: '#F5F5F5' }}
                      >
                        <option value="attaquant">Attaquant</option>
                        <option value="defenseur">Défenseur</option>
                        <option value="gardien">Gardien</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5 }}>STYLE</label>
                      <input
                        value={form.style ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, style: e.target.value }))}
                        style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 10, border: '1px solid #ddd', background: '#F5F5F5' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5 }}>TAILLE (CM)</label>
                      <input
                        type="number"
                        value={form.height_cm ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value ? Number(e.target.value) : null }))}
                        style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 10, border: '1px solid #ddd', background: '#F5F5F5' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5 }}>POIDS (KG)</label>
                      <input
                        type="number"
                        value={form.weight_kg ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value ? Number(e.target.value) : null }))}
                        style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 10, border: '1px solid #ddd', background: '#F5F5F5' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5 }}>TIR</label>
                      <select
                        value={form.shoots ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, shoots: e.target.value }))}
                        style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 10, border: '1px solid #ddd', background: '#F5F5F5' }}
                      >
                        <option value="">—</option>
                        <option value="gauche">Gauche</option>
                        <option value="droite">Droite</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5 }}>DATE DE NAISSANCE</label>
                      <input
                        type="date"
                        value={form.birth_date ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                        style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 10, border: '1px solid #ddd', background: '#F5F5F5' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5 }}>VILLE DE NAISSANCE</label>
                      <input
                        value={form.hometown ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, hometown: e.target.value }))}
                        placeholder="Ex : Nantes"
                        style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 10, border: '1px solid #ddd', background: '#F5F5F5' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5 }}>DRAFTÉ EN</label>
                    <input
                      type="number"
                      value={form.joined_year ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, joined_year: e.target.value ? Number(e.target.value) : null }))}
                      style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 10, border: '1px solid #ddd', background: '#F5F5F5' }}
                    />
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5, marginBottom: 6 }}>PALMARÈS</div>
                  {palmares.length === 0 ? (
                    <p style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>Rien pour l&apos;instant.</p>
                  ) : (
                    palmares.map((p) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 14 }}>
                        <span>🏆 {p.trophy}{p.year ? ` (${p.year})` : ''}</span>
                        <button onClick={() => handleDeleteTrophy(p.id)} style={{ background: 'none', border: 'none', color: '#B23A2E', cursor: 'pointer', fontSize: 12 }}>Supprimer</button>
                      </div>
                    ))
                  )}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input
                      placeholder="Trophée"
                      value={newTrophy}
                      onChange={(e) => setNewTrophy(e.target.value)}
                      style={{ flex: 2, padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
                    />
                    <input
                      placeholder="Année"
                      type="number"
                      value={newTrophyYear}
                      onChange={(e) => setNewTrophyYear(e.target.value)}
                      style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
                    />
                  </div>
                  <button
                    onClick={handleAddTrophy}
                    className="blm-pill"
                    style={{ width: '100%', marginBottom: 16 }}
                  >
                    + Ajouter
                  </button>

                  <div style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5, marginBottom: 6 }}>ANECDOTES & MOMENTS MARQUANTS</div>
                  {notes.length === 0 ? (
                    <p style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>Rien pour l&apos;instant.</p>
                  ) : (
                    notes.map((n) => (
                      <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 14 }}>
                        <span>{n.text}{n.year ? ` (${n.year})` : ''}</span>
                        <button onClick={() => handleDeleteNote(n.id)} style={{ background: 'none', border: 'none', color: '#B23A2E', cursor: 'pointer', fontSize: 12 }}>Supprimer</button>
                      </div>
                    ))
                  )}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input
                      placeholder="Anecdote"
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      style={{ flex: 2, padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
                    />
                    <input
                      placeholder="Année"
                      type="number"
                      value={newNoteYear}
                      onChange={(e) => setNewNoteYear(e.target.value)}
                      style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
                    />
                  </div>
                  <button
                    onClick={handleAddNote}
                    className="blm-pill"
                    style={{ width: '100%', marginBottom: 16 }}
                  >
                    + Ajouter
                  </button>

                  <div style={{ fontSize: 12, fontWeight: 'bold', color: '#888', letterSpacing: 0.5, marginBottom: 6 }}>À PROPOS</div>
                  <textarea
                    value={form.bio ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Rédigez votre bio ici..."
                    rows={4}
                    style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #ddd', background: '#F5F5F5', marginBottom: 20 }}
                  />

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setIsEditing(false)}
                      style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="blm-btn-primary"
                      style={{ flex: 1 }}
                    >
                      {saving ? 'Enregistrement...' : '✓ Enregistrer ma fiche'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
