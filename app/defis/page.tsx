'use client'

import { useState } from 'react'
import NavBar from '@/app/components/NavBar'
import DefisTab from './DefisTab'
import BadgesTab from './BadgesTab'

const CLUB_BLUE = '#003F6E'

export default function DefisPage() {
  const [tab, setTab] = useState<'defis' | 'badges'>('defis')

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
        <h1 style={{ marginBottom: 16, color: CLUB_BLUE, fontSize: 26 }}>Défis</h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => setTab('defis')}
            className={tab === 'defis' ? 'blm-pill-active' : 'blm-pill'}
          >
            Défis
          </button>
          <button
            onClick={() => setTab('badges')}
            className={tab === 'badges' ? 'blm-pill-active' : 'blm-pill'}
          >
            Badges
          </button>
        </div>

        {tab === 'defis' ? <DefisTab /> : <BadgesTab />}
      </div>
    </div>
  )
}
