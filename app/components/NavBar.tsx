'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadMe() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (player) setMyPlayerId(player.id)
    }
    loadMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    setMenuOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleEditProfile() {
    setMenuOpen(false)
    if (myPlayerId) {
      router.push(`/vestiaire?player=${myPlayerId}&edit=1`)
    } else {
      router.push('/vestiaire')
    }
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

      <div ref={menuRef} style={{ marginLeft: 'auto', position: 'relative' }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Paramètres du compte"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff',
            width: 36,
            height: 36,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            padding: 0,
          }}
        >
          ⚙️
        </button>

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 44,
              right: 0,
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              minWidth: 200,
              overflow: 'hidden',
              zIndex: 50,
            }}
          >
            <button
              onClick={handleEditProfile}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                fontSize: 14,
                color: '#222',
              }}
            >
              👤 Modifier mon profil
            </button>
            <button
              onClick={handleLogout}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                color: '#B23A2E',
              }}
            >
              🚪 Se déconnecter
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
