
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isRealAdmin, effectiveIsAdmin, getPreviewPlayer, setPreviewPlayer } from '@/lib/viewRole'

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
  const [myRole, setMyRole] = useState<string | null>(null)
  const [previewPlayer, setPreviewPlayerState] = useState(() => getPreviewPlayer())
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadMe() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: player } = await supabase
        .from('players')
        .select('id, role')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (player) {
        setMyPlayerId(player.id)
        setMyRole(player.role)
      }
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

  function handleSetView(view: 'admin' | 'joueur') {
    setPreviewPlayer(view === 'joueur')
    setMenuOpen(false)
    window.location.reload()
  }

  function handleGoToLeague() {
    setMenuOpen(false)
    router.push('/parametres')
  }

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: CLUB_BLUE,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 16px 6px',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', minWidth: 0 }}>
          <Image src="/logo.png" alt="Beer League Manager" width={32} height={40} style={{ objectFit: 'contain', flexShrink: 0 }} />
          <span
            style={{
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 16,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Beer League Manager
          </span>
        </Link>

        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
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
                minWidth: 220,
                overflow: 'hidden',
                zIndex: 50,
              }}
            >
              {isRealAdmin(myRole) && (
                <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderBottom: '1px solid #eee' }}>
                  <button
                    onClick={() => handleSetView('joueur')}
                    style={{
                      flex: 1, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      border: `1px solid ${CLUB_BLUE}`,
                      background: previewPlayer ? CLUB_BLUE : '#fff',
                      color: previewPlayer ? '#fff' : CLUB_BLUE,
                    }}
                  >
                    Vue joueur
                  </button>
                  <button
                    onClick={() => handleSetView('admin')}
                    style={{
                      flex: 1, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      border: `1px solid ${CLUB_BLUE}`,
                      background: !previewPlayer ? CLUB_BLUE : '#fff',
                      color: !previewPlayer ? '#fff' : CLUB_BLUE,
                    }}
                  >
                    Vue admin
                  </button>
                </div>
              )}
              {effectiveIsAdmin(myRole) && (
                <button
                  onClick={handleGoToLeague}
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
                  🏆 Gérer la ligue
                </button>
              )}
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
      </div>

      <div
        className="blm-nav-links"
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          padding: '0 16px 10px',
        }}
      >
        {LINKS.slice(1).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{ color: '#fff', textDecoration: 'none', fontSize: 14, opacity: 0.9, flexShrink: 0 }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
