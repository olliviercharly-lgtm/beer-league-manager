'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CLUB_BLUE = '#003F6E'

const LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/calendar', label: 'Calendrier' },
  { href: '/vestiaire', label: 'Vestiaire' },
  { href: '/resultats', label: 'Résultats' },
  { href: '/defis', label: 'Défis' },
  { href: '/gazette', label: 'Gazette' },
]

export default function NavBar() {
  const supabase = createClient()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '10px 20px',
        background: CLUB_BLUE,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        marginBottom: 24,
        flexWrap: 'wrap',
      }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <Image src="/logo.png" alt="Beer League Manager" width={36} height={44} style={{ objectFit: 'contain' }} />
        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 17, whiteSpace: 'nowrap' }}>
          Beer League Manager
        </span>
      </Link>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {LINKS.slice(1).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{ color: '#fff', textDecoration: 'none', fontSize: 15, opacity: 0.9 }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <button
        onClick={handleLogout}
        style={{
          marginLeft: 'auto',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.4)',
          color: '#fff',
          padding: '6px 14px',
          borderRadius: 20,
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        Déconnexion
      </button>
    </nav>
  )
}
