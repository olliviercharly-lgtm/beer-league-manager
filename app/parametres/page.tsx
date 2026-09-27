'use client'

import { useEffect, useState } from 'react'
import NavBar from '@/app/components/NavBar'

const CLUB_BLUE = '#003F6E'

const COLOR_PALETTE = [
  '#141414', '#FFFFFF', '#003F6E', '#B23A2E', '#2E7D5B',
  '#C9A227', '#6B3FA0', '#3B6EA5', '#E0A83E', '#8A8A8A',
]

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'BLM-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default function ParametresPage() {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  const [name, setName] = useState('')
  const [teamNoirName, setTeamNoirName] = useState('')
  const [teamBlancName, setTeamBlancName] = useState('')
  const [teamNoirColor, setTeamNoirColor] = useState('#141414')
  const [teamBlancColor, setTeamBlancColor] = useState('#FFFFFF')
  const [inviteCode, setInviteCode] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin)

    async function load() {
      const res = await fetch('/api/league')
      if (res.status !== 200) {
        setAllowed(false)
        setLoading(false)
        return
      }
      const data = await res.json()
      if (data.league) {
        setAllowed(true)
        setName(data.league.name)
        setTeamNoirName(data.league.team_noir_name)
        setTeamBlancName(data.league.team_blanc_name)
        setTeamNoirColor(data.league.team_noir_color)
        setTeamBlancColor(data.league.team_blanc_color)
        setInviteCode(data.league.invite_code)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/league', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        team_noir_name: teamNoirName,
        team_blanc_name: teamBlancName,
        team_noir_color: teamNoirColor,
        team_blanc_color: teamBlancColor,
        invite_code: inviteCode.trim().toUpperCase(),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Erreur lors de la sauvegarde.')
    } else {
      setSuccess('Modifications enregistrées.')
      setInviteCode(inviteCode.trim().toUpperCase())
    }
    setSaving(false)
  }

  function handleRegenerateCode() {
    setInviteCode(generateInviteCode())
  }

  function handleCopyLink() {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inviteLink = origin && inviteCode ? `${origin}/onboarding?code=${encodeURIComponent(inviteCode)}` : ''
  const whatsappMessage = `Rejoins notre ligue "${name}" sur Beer League Manager : ${inviteLink}`
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`

  if (loading) {
    return (
      <>
        <NavBar />
        <p style={{ padding: 40 }}>Chargement...</p>
      </>
    )
  }

  if (!allowed) {
    return (
      <>
        <NavBar />
        <div style={{ padding: 40 }}>
          <p>Accès réservé aux administrateurs.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <NavBar />
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 60px' }}>
        <h1 style={{ fontSize: 22, marginBottom: 20 }}>🏆 Gérer la ligue</h1>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="blm-card">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 6, textTransform: 'uppercase' }}>
              Nom de la ligue
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8, boxSizing: 'border-box' }}
            />
          </div>

          <div className="blm-card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 6, textTransform: 'uppercase' }}>
                Nom équipe 1
              </label>
              <input
                value={teamNoirName}
                onChange={(e) => setTeamNoirName(e.target.value)}
                required
                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8, boxSizing: 'border-box', marginBottom: 12 }}
              />
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 6, textTransform: 'uppercase' }}>
                Couleur équipe 1
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTeamNoirColor(c)}
                    aria-label={c}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                      background: c,
                      border: c === teamNoirColor ? `3px solid ${CLUB_BLUE}` : '1px solid #ccc',
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 6, textTransform: 'uppercase' }}>
                Nom équipe 2
              </label>
              <input
                value={teamBlancName}
                onChange={(e) => setTeamBlancName(e.target.value)}
                required
                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8, boxSizing: 'border-box', marginBottom: 12 }}
              />
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 6, textTransform: 'uppercase' }}>
                Couleur équipe 2
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTeamBlancColor(c)}
                    aria-label={c}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                      background: c,
                      border: c === teamBlancColor ? `3px solid ${CLUB_BLUE}` : '1px solid #ccc',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="blm-card">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 6, textTransform: 'uppercase' }}>
              Code d&apos;invitation
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                style={{ flex: 1, padding: 10, border: '1px solid #ccc', borderRadius: 8, fontFamily: 'monospace', letterSpacing: 1 }}
              />
              <button
                type="button"
                onClick={handleRegenerateCode}
                style={{ padding: '0 14px', borderRadius: 8, border: `1px solid ${CLUB_BLUE}`, background: '#fff', color: CLUB_BLUE, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                🔄 Régénérer
              </button>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 6, textTransform: 'uppercase' }}>
                Lien d&apos;invitation
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  readOnly
                  value={inviteLink}
                  onFocus={(e) => e.target.select()}
                  style={{ flex: '1 1 220px', padding: 10, border: '1px solid #ccc', borderRadius: 8, fontSize: 12, color: '#555' }}
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{ padding: '0 14px', borderRadius: 8, border: '1px solid #999', background: '#fff', color: '#555', cursor: 'pointer', fontWeight: 600 }}
                >
                  {copied ? '✓ Copié' : '📋 Copier'}
                </button>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding: '0 14px', height: 38, display: 'flex', alignItems: 'center', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}
                >
                  💬 WhatsApp
                </a>
              </div>
            </div>
          </div>

          {error && <p style={{ color: '#B23A2E', fontSize: 14 }}>{error}</p>}
          {success && <p style={{ color: '#2E7D5B', fontSize: 14 }}>{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="blm-btn-primary"
            style={{ justifyContent: 'center' }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
      </div>
    </>
  )
}
