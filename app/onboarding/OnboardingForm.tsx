'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type CodeStatus = 'idle' | 'checking' | 'valid' | 'invalid'

export default function OnboardingForm({ initialCode = '' }: { initialCode?: string }) {
  const router = useRouter()

  const [inviteCode, setInviteCode] = useState(() => {
    if (initialCode) return initialCode
    if (typeof window === 'undefined') return ''
    try {
      return localStorage.getItem('blm_invite_code') || ''
    } catch {
      return ''
    }
  })
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [team, setTeam] = useState('noir')
  const [position, setPosition] = useState('attaquant')
  const [number, setNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [codeStatus, setCodeStatus] = useState<CodeStatus>('idle')
  const [leagueName, setLeagueName] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = inviteCode.trim()
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCodeStatus('idle')
      setLeagueName('')
      return
    }

    setCodeStatus('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/invite-code?code=${encodeURIComponent(trimmed)}`)
        const data = await res.json()
        if (data.valid) {
          setCodeStatus('valid')
          setLeagueName(data.leagueName || '')
        } else {
          setCodeStatus('invalid')
          setLeagueName('')
        }
      } catch {
        setCodeStatus('invalid')
        setLeagueName('')
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [inviteCode])

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

    try {
      localStorage.removeItem('blm_invite_code')
    } catch {
      // pas bloquant
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <h1 style={{ marginBottom: 24 }}>Crée ta fiche joueur</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <input
            placeholder="Code d'invitation de la ligue"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
            style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6, width: '100%', boxSizing: 'border-box' }}
          />
          {codeStatus === 'checking' && (
            <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>Vérification...</p>
          )}
          {codeStatus === 'valid' && (
            <p style={{ fontSize: 13, color: '#2E7D5B', margin: '4px 0 0' }}>
              Tu rejoins {leagueName || 'la ligue'} ✓
            </p>
          )}
          {codeStatus === 'invalid' && (
            <p style={{ fontSize: 13, color: '#B23A2E', margin: '4px 0 0' }}>
              Code d&apos;invitation invalide.
            </p>
          )}
        </div>
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
          disabled={loading || codeStatus !== 'valid'}
          style={{
            padding: 10,
            borderRadius: 6,
            background: '#2E7D5B',
            color: '#fff',
            border: 'none',
            cursor: loading || codeStatus !== 'valid' ? 'not-allowed' : 'pointer',
            opacity: loading || codeStatus !== 'valid' ? 0.6 : 1,
          }}
        >
          {loading ? '...' : 'Créer ma fiche'}
        </button>
      </form>
    </div>
  )
}
