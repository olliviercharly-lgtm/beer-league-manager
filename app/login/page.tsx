'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setError("Compte créé ! Vérifie ta boîte mail pour confirmer, puis connecte-toi.")
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
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 24 }}>
        {mode === 'login' ? 'Connexion' : 'Créer un compte'}
      </h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        {error && <p style={{ color: '#B23A2E', fontSize: 14 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, borderRadius: 6, background: '#2E7D5B', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {loading ? '...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        style={{ marginTop: 16, background: 'none', border: 'none', color: '#2E7D5B', cursor: 'pointer' }}
      >
        {mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
      </button>
    </div>
  )
}
