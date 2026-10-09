'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import NavBar from '@/app/components/NavBar'

const CLUB_BLUE = '#003F6E'
const CLUB_GOLD = '#C9A227'

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

  type PlayerRow = { id: string; first_name: string; last_name: string; team: string; role: string; is_hybrid: boolean }
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null)
  const [roleError, setRoleError] = useState('')
  const [hybridSavingId, setHybridSavingId] = useState<string | null>(null)

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

        const playersRes = await fetch('/api/players')
        if (playersRes.ok) {
          const playersData = await playersRes.json()
          setPlayers(playersData.players || [])
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleToggleRole(playerId: string, currentRole: string) {
    setRoleSavingId(playerId)
    setRoleError('')
    const newRole = currentRole === 'admin' ? 'player' : 'admin'

    const res = await fetch('/api/players', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, role: newRole }),
    })

    const data = await res.json()
    if (!res.ok) {
      setRoleError(data.error || 'Erreur lors de la modification.')
    } else {
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, role: newRole } : p)))
    }
    setRoleSavingId(null)
  }

  async function handleToggleHybrid(playerId: string, currentHybrid: boolean) {
    setHybridSavingId(playerId)
    setRoleError('')

    const res = await fetch('/api/players', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, is_hybrid: !currentHybrid }),
    })

    const data = await res.json()
    if (!res.ok) {
      setRoleError(data.error || 'Erreur lors de la modification.')
    } else {
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, is_hybrid: !currentHybrid } : p)))
    }
    setHybridSavingId(null)
  }

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

  const inviteLink = origin && inviteCode ? `${origin}/onboarding?invite=${encodeURIComponent(inviteCode)}` : ''
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

        <Link
          href="/redaction"
          className="blm-card"
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, textDecoration: 'none', color: 'inherit' }}
        >
          <span style={{ fontSize: 26 }}>🖋️</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontWeight: 700, color: CLUB_BLUE }}>Salle de rédaction</span>
            <span style={{ display: 'block', fontSize: 13, color: '#666' }}>Personnalité de l&apos;IA, tons des articles et consignes de la Gazette</span>
          </span>
          <span style={{ color: CLUB_BLUE, fontSize: 18 }}>›</span>
        </Link>

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

        <h2 style={{ fontSize: 18, margin: '32px 0 12px' }}>👥 Gestion des admins</h2>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
          Les administrateurs peuvent gérer la ligue, valider les défis et modifier les fiches.
        </p>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Les joueurs hybrides peuvent aussi se positionner comme gardien pendant les entraînements.
        </p>

        {roleError && <p style={{ color: '#B23A2E', fontSize: 14, marginBottom: 12 }}>{roleError}</p>}

        <div className="blm-card" style={{ padding: 0, overflow: 'hidden' }}>
          {players.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '12px 16px', borderBottom: i < players.length - 1 ? '1px solid #eee' : 'none',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {p.team === 'noir' ? teamNoirName : teamBlancName}
                  {p.role === 'super_admin' && ' · Super admin'}
                  {p.role === 'admin' && ' · Admin'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => handleToggleHybrid(p.id, p.is_hybrid)}
                  disabled={hybridSavingId === p.id}
                  style={{
                    padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    border: `1px solid ${p.is_hybrid ? CLUB_GOLD : '#ccc'}`,
                    background: p.is_hybrid ? '#FBF3DD' : '#fff',
                    color: p.is_hybrid ? CLUB_GOLD : '#999',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {hybridSavingId === p.id ? '...' : p.is_hybrid ? '🥅 Hybride' : 'Rendre hybride'}
                </button>
                {p.role === 'super_admin' ? (
                  <span style={{ fontSize: 12, color: '#999' }}>Protégé</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleRole(p.id, p.role)}
                    disabled={roleSavingId === p.id}
                    style={{
                      padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      border: `1px solid ${p.role === 'admin' ? '#B23A2E' : CLUB_BLUE}`,
                      background: '#fff',
                      color: p.role === 'admin' ? '#B23A2E' : CLUB_BLUE,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {roleSavingId === p.id ? '...' : p.role === 'admin' ? 'Retirer admin' : 'Rendre admin'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {players.length === 0 && (
            <p style={{ padding: 16, color: '#666', fontSize: 14 }}>Aucun joueur trouvé.</p>
          )}
        </div>
      </div>
    </>
  )
}
