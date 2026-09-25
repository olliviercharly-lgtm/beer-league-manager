'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()

  const [inviteCode, setInviteCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [team, setTeam] = useState('noir')
  const [position, setPosition] = useState('attaquant')
  const [number, setNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteCode,
        firstName,
        lastName,
        team,
        position,
        number: number ? parseInt(number, 10) : null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Une erreur est survenue.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 24 }}>Crée ta fiche joueur</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          placeholder="Code d'invitation de la ligue"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          required
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <input
          placeholder="Prénom"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <input
          placeholder="Nom"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <select value={team} onChange={(e) => setTeam(e.target.value)} style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}>
          <option value="noir">Équipe Noir</option>
          <option value="blanc">Équipe Blanc</option>
        </select>
        <select value={position} onChange={(e) => setPosition(e.target.value)} style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}>
          <option value="attaquant">Attaquant</option>
          <option value="defenseur">Défenseur</option>
          <option value="gardien">Gardien</option>
        </select>
        <input
          type="number"
          placeholder="Numéro (optionnel)"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        {error && <p style={{ color: '#B23A2E', fontSize: 14 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, borderRadius: 6, background: '#2E7D5B', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {loading ? '...' : 'Créer ma fiche'}
        </button>
      </form>
    </div>
  )
}
