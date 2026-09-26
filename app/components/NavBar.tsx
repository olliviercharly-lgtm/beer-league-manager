'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NavBar() {
  const supabase = createClient()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px', borderBottom: '1px solid #333', marginBottom: 24, flexWrap: 'wrap' }}>
      <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}>Accueil</Link>
      <Link href="/calendar" style={{ color: '#fff', textDecoration: 'none' }}>Calendrier</Link>
      <Link href="/vestiaire" style={{ color: '#fff', textDecoration: 'none' }}>Vestiaire</Link>
      <Link href="/resultats" style={{ color: '#fff', textDecoration: 'none' }}>Résultats</Link>
      <Link href="/defis" style={{ color: '#fff', textDecoration: 'none' }}>Défis</Link>
      <Link href="/gazette" style={{ color: '#fff', textDecoration: 'none' }}>Gazette</Link>
      <button
        onClick={handleLogout}
        style={{ marginLeft: 'auto', background: 'none', border: '1px solid #555', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}
      >
        Déconnexion
      </button>
    </nav>
  )
}
