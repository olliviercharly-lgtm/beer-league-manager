'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/app/components/NavBar'

const CLUB_BLUE = '#003F6E'

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

function positionLabel(pos: string | null) {
  if (pos === 'attaquant') return 'Attaquant'
  if (pos === 'defenseur') return 'Défenseur'
  if (pos === 'gardien') return 'Gardien'
  return '—'
}

export default function PlayerDetailPage() {
  const params = useParams()
  const playerId = params.id as string
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [myId, setMyId] = useState<string | null>(null)
  const [player, setPlayer] = useState<PlayerDetail | null>(null)
  const [palmares, setPalmares] = useState<Palmares[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (myId && player && myId === player.id && searchParams.get('edit') === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditing(true)
    }
  }, [myId, player, searchParams])

  const [form, setForm] = useState<Partial<PlayerDetail>>({})
  const [newTrophy, setNewTrophy] = useState('')
  const [newTrophyYear, setNewTrophyYear] = useState('')
  const [newNoteText, setNewNoteText] = useState('')
  const [newNoteYear, setNewNoteYear] = useState('')

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: meData } = await supabase
        .from('players')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      setMyId(meData?.id ?? null)
    }

    const { data: playerData } = await supabase
      .from('players')
      .select('id, auth_user_id, first_name, last_name, number, team, position, style, bio, height_cm, weight_kg, shoots, birth_date, hometown, joined_year')
      .eq('id', playerId)
      .single()
    setPlayer(playerData)
    setForm(playerData || {})

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

    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
  }, [playerId])

  async function handleSave() {
    if (!player) return
    setSaving(true)
    await supabase
      .from('players')
      .update({
        number: form.number ?? null,
        team: form.team,
        position: form.position,
        style: form.style ?? null,
        bio: form.bio ?? null,
        height_cm: form.height_cm ?? null,
        weight_kg: form.weight_kg ?? null,
        shoots: form.shoots ?? null,
        birth_date: form.birth_date ?? null,
        hometown: form.hometown ?? null,
        joined_year: form.joined_year ?? null,
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
      trophy: newTrophy.trim(),
      year: newTrophyYear ? parseInt(newTrophyYear, 10) : null,
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
      text: newNoteText.trim(),
      year: newNoteYear ? parseInt(newNoteYear, 10) : null,
    })
    setNewNoteText('')
    setNewNoteYear('')
    loadAll()
  }

  async function handleDeleteNote(id: string) {
    await supabase.from('player_notes').delete().eq('id', id)
    loadAll()
  }

  if (loading) return <p style={{ padding: 40 }}>Chargement...</p>
  if (!player) return <p style={{ padding: 40 }}>Joueur introuvable.</p>

  const isOwner = myId === player.id
  const initials = `${player.first_name[0] || ''}${player.last_name[0] || ''}`.toUpperCase()
  const isNoir = player.team === 'noir'

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 720, margin: '0 auto 40px', fontFamily: 'sans-serif', padding: '0 16px' }}>

        <div className="blm-card" style={{ marginTop: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div
              style={{
                width: 64, height: 64, borderRadius: '50%', background: CLUB_BLUE, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 22, flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 'bold' }}>{player.first_name} {player.last_name}</span>
                <span
                  style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: isNoir ? '#111' : '#fff', border: '1px solid #111', display: 'inline-block',
                  }}
                  title={isNoir ? 'Équipe Noir' : 'Équipe Blanc'}
                />
              </div>
              <div style={{ color: '#666', marginTop: 4 }}>
                #{player.number ?? '-'} · {positionLabel(player.position)}
                {player.style && ` · ${player.style}`}
              </div>
            </div>
            {isOwner && (
              <button
                onClick={() => setIsEditing((v) => !v)}
                className="blm-btn-primary"
              >
                {isEditing ? 'Voir ma fiche' : 'Modifier ma fiche'}
              </button>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="blm-card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, color: CLUB_BLUE, marginBottom: 14 }}>Informations</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, fontSize: 14 }}>
              <div><div style={{ color: '#999', fontSize: 12 }}>Taille</div>{player.height_cm ? `${player.height_cm} cm` : '—'}</div>
              <div><div style={{ color: '#999', fontSize: 12 }}>Poids</div>{player.weight_kg ? `${player.weight_kg} kg` : '—'}</div>
              <div><div style={{ color: '#999', fontSize: 12 }}>Tir</div>{player.shoots ? (player.shoots === 'droite' ? 'Droite' : 'Gauche') : '—'}</div>
              <div><div style={{ color: '#999', fontSize: 12 }}>Ville natale</div>{player.hometown || '—'}</div>
              <div><div style={{ color: '#999', fontSize: 12 }}>Date de naissance</div>{player.birth_date ? new Date(player.birth_date).toLocaleDateString('fr-FR') : '—'}</div>
              <div><div style={{ color: '#999', fontSize: 12 }}>Drafté en</div>{player.joined_year || '—'}</div>
            </div>
            {player.bio && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee', fontSize: 14, lineHeight: 1.6, color: '#333' }}>
                {player.bio}
              </div>
            )}
          </div>
        )}

        {isEditing && (
          <div className="blm-card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, color: CLUB_BLUE, marginBottom: 14 }}>Modifier ma fiche</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <label style={{ fontSize: 13, color: '#666' }}>
                Numéro
                <input
                  type="number"
                  value={form.number ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, number: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 10 }}
                />
              </label>
              <label style={{ fontSize: 13, color: '#666' }}>
                Équipe
                <select
                  value={form.team ?? 'noir'}
                  onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}
                  style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 10 }}
                >
                  <option value="noir">Noir</option>
                  <option value="blanc">Blanc</option>
                </select>
              </label>
              <label style={{ fontSize: 13, color: '#666' }}>
                Poste
                <select
                  value={form.position ?? 'attaquant'}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 10 }}
                >
                  <option value="attaquant">Attaquant</option>
                  <option value="defenseur">Défenseur</option>
                  <option value="gardien">Gardien</option>
                </select>
              </label>
              <label style={{ fontSize: 13, color: '#666' }}>
                Style
                <input
                  value={form.style ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, style: e.target.value }))}
                  style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 10 }}
                />
              </label>
              <label style={{ fontSize: 13, color: '#666' }}>
                Taille (cm)
                <input
                  type="number"
                  value={form.height_cm ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 10 }}
                />
              </label>
              <label style={{ fontSize: 13, color: '#666' }}>
                Poids (kg)
                <input
                  type="number"
                  value={form.weight_kg ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 10 }}
                />
              </label>
              <label style={{ fontSize: 13, color: '#666' }}>
                Tir
                <select
                  value={form.shoots ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, shoots: e.target.value }))}
                  style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 10 }}
                >
                  <option value="">—</option>
                  <option value="droite">Droite</option>
                  <option value="gauche">Gauche</option>
                </select>
              </label>
              <label style={{ fontSize: 13, color: '#666' }}>
                Ville natale
                <input
                  value={form.hometown ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, hometown: e.target.value }))}
                  style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 10 }}
                />
              </label>
              <label style={{ fontSize: 13, color: '#666' }}>
                Date de naissance
                <input
                  type="date"
                  value={form.birth_date ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                  style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 10 }}
                />
              </label>
              <label style={{ fontSize: 13, color: '#666' }}>
                Drafté en
                <input
                  type="number"
                  value={form.joined_year ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, joined_year: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 10 }}
                />
              </label>
            </div>
            <label style={{ fontSize: 13, color: '#666', display: 'block', marginTop: 14 }}>
              Bio
              <textarea
                value={form.bio ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ddd', borderRadius: 10, minHeight: 90 }}
              />
            </label>
            <button onClick={handleSave} disabled={saving} className="blm-btn-primary" style={{ marginTop: 16 }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        )}

        <div className="blm-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, color: CLUB_BLUE, marginBottom: 14 }}>Palmarès</h2>
          {palmares.length === 0 && <p style={{ color: '#999', fontSize: 14 }}>Aucun trophée renseigné.</p>}
          {palmares.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
              <span>{p.trophy}{p.year ? ` (${p.year})` : ''}</span>
              {isOwner && (
                <button onClick={() => handleDeleteTrophy(p.id)} style={{ background: 'none', border: 'none', color: '#B23A2E', cursor: 'pointer', fontSize: 13 }}>
                  Supprimer
                </button>
              )}
            </div>
          ))}
          {isOwner && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <input
                placeholder="Trophée"
                value={newTrophy}
                onChange={(e) => setNewTrophy(e.target.value)}
                style={{ flex: 1, minWidth: 140, padding: 8, border: '1px solid #ddd', borderRadius: 10 }}
              />
              <input
                placeholder="Année"
                type="number"
                value={newTrophyYear}
                onChange={(e) => setNewTrophyYear(e.target.value)}
                style={{ width: 90, padding: 8, border: '1px solid #ddd', borderRadius: 10 }}
              />
              <button onClick={handleAddTrophy} className="blm-btn-primary">Ajouter</button>
            </div>
          )}
        </div>

        <div className="blm-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, color: CLUB_BLUE, marginBottom: 14 }}>Anecdotes &amp; moments marquants</h2>
          {notes.length === 0 && <p style={{ color: '#999', fontSize: 14 }}>Aucune anecdote renseignée.</p>}
          {notes.map((n) => (
            <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
              <span>{n.text}{n.year ? ` (${n.year})` : ''}</span>
              {isOwner && (
                <button onClick={() => handleDeleteNote(n.id)} style={{ background: 'none', border: 'none', color: '#B23A2E', cursor: 'pointer', fontSize: 13 }}>
                  Supprimer
                </button>
              )}
            </div>
          ))}
          {isOwner && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <input
                placeholder="Anecdote"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                style={{ flex: 1, minWidth: 140, padding: 8, border: '1px solid #ddd', borderRadius: 10 }}
              />
              <input
                placeholder="Année"
                type="number"
                value={newNoteYear}
                onChange={(e) => setNewNoteYear(e.target.value)}
                style={{ width: 90, padding: 8, border: '1px solid #ddd', borderRadius: 10 }}
              />
              <button onClick={handleAddNote} className="blm-btn-primary">Ajouter</button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
