'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const CLUB_BLUE = '#003F6E'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setSuccess('Compte créé ! Vérifie ta boîte mail pour confirmer, puis connecte-toi.')
      setMode('login')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="blm-card" style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <Image src="/logo.png" alt="Beer League Manager" width={72} height={88} style={{ objectFit: 'contain', margin: '0 auto 12px' }} />
        <div style={{ color: CLUB_BLUE, fontWeight: 'bold', fontSize: 20, marginBottom: 4 }}>
          Beer League Manager
        </div>
        <div style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
          {mode === 'login' ? 'Connecte-toi pour accéder à ton équipe' : 'Crée ton compte pour rejoindre l\'équipe'}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 10, fontSize: 15 }}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 10, fontSize: 15 }}
          />
          {error && <p style={{ color: '#B23A2E', fontSize: 13, margin: 0 }}>{error}</p>}
          {success && <p style={{ color: '#2E7D5B', fontSize: 13, margin: 0 }}>{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="blm-btn-primary"
            style={{ width: '100%', marginTop: 4 }}
          >
            {loading ? '...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccess(null) }}
          style={{ marginTop: 20, background: 'none', border: 'none', color: CLUB_BLUE, cursor: 'pointer', fontSize: 14 }}
        >
          {mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  )
}
